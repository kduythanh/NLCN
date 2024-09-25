// server.js
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const swaggerDocs = require('./docs/swagger');
const mysql = require('mysql2');
const path = require('path');
const db = require('./config/db');
// // const bcrypt = require('bcryptjs');
// const bodyParser = require('body-parser');
const session = require('express-session');
const { fail } = require('assert');

const app = express();
const port = 3000;

// Middleware để sử dụng CORS
app.use(cors());
// Middleware để xử lý JSON
app.use(express.json());
// Middleware để xử lý dữ liệu url-encoded
app.use(express.urlencoded({ extended: true }));
// Middleware để phục vụ tệp tĩnh từ thư mục Frontend và các thư mục có chứa file HTML cần xử lý
app.use(express.static(path.join(__dirname, '../Frontend')));
app.use(express.static(path.join(__dirname, '../Frontend/roles/admin')));
app.use(express.static(path.join(__dirname, '../Frontend/roles/hdts')));
app.use(express.static(path.join(__dirname, '../Frontend/roles/hocsinh')));
app.use(express.static(path.join(__dirname, '../Frontend/roles/thcs')));
app.use(express.static(path.join(__dirname, '../Frontend/roles/thpt')));
// Cấu hình express-session
app.use(session({
    secret: 'secret-key', // Thay đổi secret này thành một chuỗi an toàn
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
    }
}));

// Cấu hình các route cơ bản
// Route mặc định để trả về homepage.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/homepage.html'));
});

// Xử lý đăng nhập
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT * FROM tai_khoan WHERE TEN_TAI_KHOAN = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            const user = results[0];
            // const isMatch = bcrypt.compareSync(password, user.MAT_KHAU);
            const isMatch = (password === user.MAT_KHAU);
            if (isMatch) {
                const taiKhoan = {
                    tenTaiKhoan: user.TEN_TAI_KHOAN,
                    matKhau: user.MAT_KHAU,
                    doiTuong: user.DOI_TUONG,
                    maTruong: user.MA_TRUONG
                };
                req.session.tenTaiKhoan = taiKhoan.tenTaiKhoan;
                req.session.doiTuong = taiKhoan.doiTuong;
                switch (user.DOI_TUONG) {
                    case 'admin':
                        return res.redirect('/admin');
                    case 'sgddt':
                        return res.redirect('/sgddt');                
                    case 'thcs':
                        req.session.maTruong = taiKhoan.maTruong;
                        db.query('SELECT TEN_THCS FROM TRUONG_THCS WHERE MA_THCS = ?', [taiKhoan.maTruong], (error, results) => {
                            if (error) {
                                return res.status(500).send('Lỗi truy vấn database.');
                            }
                            if (results.length > 0) {
                                req.session.tenTruong = results[0].TEN_THCS;
                                return res.redirect('/thcs');
                            } else {
                                return res.status(404).send('Không tìm thấy trường.');
                            }
                        });
                        break;
                    case 'thpt':
                        req.session.maTruong = taiKhoan.maTruong;
                        db.query('SELECT TEN_THPT FROM TRUONG_THPT WHERE MA_THPT = ?', [taiKhoan.maTruong], (error, results) => {
                            if (error) {
                                return res.status(500).send('Lỗi truy vấn database.');
                            }
                            if (results.length > 0) {
                                req.session.tenTruong = results[0].TEN_THPT;
                                return res.redirect('/thpt');
                            } else {
                                return res.status(404).send('Không tìm thấy trường.');
                            }
                        });
                        break;
                    default:
                        req.session.maHocSinh = taiKhoan.tenTaiKhoan;
                        db.query('SELECT HO_TEN_HOC_SINH FROM HOC_SINH WHERE MA_HOC_SINH = ?', [taiKhoan.tenTaiKhoan], (error, results) => {
                            if (error) {
                                return res.status(500).send('Lỗi truy vấn database.');
                            }
                            if (results.length > 0) {
                                req.session.tenHocSinh = results[0].HO_TEN_HOC_SINH;
                                return res.redirect('/hocsinh');
                            } else {
                                return res.status(404).send('Không tìm thấy học sinh.');
                            }
                        });
                        break;
                }
            } else {
                res.status(401).json({ status: fail, message: 'Mật khẩu nhập vào không chính xác, vui lòng nhập lại!' });
            }
        } else {
            res.status(401).json({ status: fail, message: 'Tài khoản không tồn tại!' });
        }
    });
});

// Các giao diện tương ứng
app.get('/admin', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'admin') {
        res.sendFile(path.join(__dirname, '../Frontend/roles/admin/admin.html'));
    } else {
        res.send('Bạn không có quyền truy cập');
    }
});
app.get('/api/admin', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'admin') {
        res.json({ tenTaiKhoan: req.session.tenTaiKhoan, doiTuong: req.session.doiTuong });
    } else {
        res.send('Bạn không có quyền truy cập');
    }
});
// Đổi mật khẩu của account Admin
app.put('/admin', (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    // Kiểm tra mật khẩu xác nhận
    if (newPassword !== confirmNewPassword) {
        return res.status(400).send('Mật khẩu xác nhận không khớp.');
    }
    // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
    db.query('SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = "admin"', (err, results) => {
        if (err || results.length === 0) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.');
        }
        const currentAdminPassword = results[0].MAT_KHAU;
        // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
        if (currentPassword !== currentAdminPassword) {
            return res.status(401).send('Mật khẩu hiện tại không chính xác.');
        }
        // Cập nhật mật khẩu mới
        db.query('UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = "admin"', [newPassword], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Có lỗi xảy ra khi cập nhật mật khẩu.');
            }
            res.sendStatus(200); // Trả về thành công
        });
    });
})
// Xử lý đăng nhập của sở GDĐT (Hội đồng tuyển sinh)
app.get('/sgddt', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'sgddt') {
        res.sendFile(path.join(__dirname, '../Frontend/roles/hdts/hdts.html'));
    } else {
        res.send('Bạn không có quyền truy cập');
    }
});
app.get('/api/hdts', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'sgddt') {
        res.json({ tenTaiKhoan: req.session.tenTaiKhoan, doiTuong: req.session.doiTuong });
    } else {
        res.send('Bạn không có quyền truy cập');
    }    
})
// Đổi mật khẩu của account HĐTS
app.put('/hdts', (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    // Kiểm tra mật khẩu xác nhận
    if (newPassword !== confirmNewPassword) {
        return res.status(400).send('Mật khẩu xác nhận không khớp.');
    }
    const tenTaiKhoan = req.session.tenTaiKhoan;
    // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
    db.query('SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = "sgddt"', (err, results) => {
        if (err || results.length === 0) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.');
        }
        const currentHDTSPassword = results[0].MAT_KHAU;
        // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
        if (currentPassword !== currentHDTSPassword) {
            return res.status(401).send('Mật khẩu hiện tại không chính xác.');
        }
        // Cập nhật mật khẩu mới
        db.query('UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = "sgddt"', (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Có lỗi xảy ra khi cập nhật mật khẩu.');
            }
            res.sendStatus(200); // Trả về thành công
        });
    });
})
// Xử lý đăng nhập account trường THCS
app.get('/thcs', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'thcs') {
        res.sendFile(path.join(__dirname, '../Frontend/roles/thcs/thcs.html'));
    } else {
        res.send('Bạn không có quyền truy cập');
    }
});
app.get('/api/thcs', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'thcs') {
        res.json({ tenTaiKhoan: req.session.tenTaiKhoan, doiTuong: req.session.doiTuong, tenTruong: req.session.tenTruong });
    } else {
        res.send('Bạn không có quyền truy cập');
    }    
})
app.put('/thcs', (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    // Kiểm tra mật khẩu xác nhận
    if (newPassword !== confirmNewPassword) {
        return res.status(400).send('Mật khẩu xác nhận không khớp.');
    }
    const tenTaiKhoan = req.session.tenTaiKhoan;
    // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
    db.query('SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?', [tenTaiKhoan], (err, results) => {
        if (err || results.length === 0) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.');
        }
        const currentTHCSPassword = results[0].MAT_KHAU;
        // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
        if (currentPassword !== currentTHCSPassword) {
            return res.status(401).send('Mật khẩu hiện tại không chính xác.');
        }
        // Cập nhật mật khẩu mới
        db.query('UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = ?', [newPassword, tenTaiKhoan], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Có lỗi xảy ra khi cập nhật mật khẩu.');
            }
            res.sendStatus(200); // Trả về thành công
        });
    });
})
app.get('/thpt', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'thpt') {
        res.sendFile(path.join(__dirname, '../Frontend/roles/thpt/thpt.html'));
    } else {
        res.send('Bạn không có quyền truy cập');
    }
});
app.get('/api/thpt', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'thpt') {
        res.json({ tenTaiKhoan: req.session.tenTaiKhoan, doiTuong: req.session.doiTuong, tenTruong: req.session.tenTruong });
    } else {
        res.send('Bạn không có quyền truy cập');
    }    
})
app.put('/thpt', (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    // Kiểm tra mật khẩu xác nhận
    if (newPassword !== confirmNewPassword) {
        return res.status(400).send('Mật khẩu xác nhận không khớp.');
    }
    const tenTaiKhoan = req.session.tenTaiKhoan;
    // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
    db.query('SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?', [tenTaiKhoan], (err, results) => {
        if (err || results.length === 0) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.');
        }
        const currentTHPTassword = results[0].MAT_KHAU;
        // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
        if (currentPassword !== currentTHPTPassword) {
            return res.status(401).send('Mật khẩu hiện tại không chính xác.');
        }
        // Cập nhật mật khẩu mới
        db.query('UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = ?', [newPassword, tenTaiKhoan], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Có lỗi xảy ra khi cập nhật mật khẩu.');
            }
            res.sendStatus(200); // Trả về thành công
        });
    });
})
// Xử lý đăng nhập của học sinh
app.get('/hocsinh', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'hocsinh') {
        res.sendFile(path.join(__dirname, '../Frontend/roles/hocsinh/hocsinh.html'));
    } else {
        res.send('Bạn không có quyền truy cập');
    }
});
app.get('/api/hocsinh', (req, res) => {
    if (req.session.tenTaiKhoan && req.session.doiTuong === 'hocsinh') {
        res.json({ tenTaiKhoan: req.session.tenTaiKhoan, doiTuong: req.session.doiTuong, tenHocSinh: req.session.tenHocSinh });
    } else {
        res.send('Bạn không có quyền truy cập');
    }
});
// Đổi mật khẩu của account Học sinh
app.put('/hocsinh', (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    // Kiểm tra mật khẩu xác nhận
    if (newPassword !== confirmNewPassword) {
        return res.status(400).send('Mật khẩu xác nhận không khớp.');
    }
    const tenTaiKhoan = req.session.tenTaiKhoan;
    // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
    db.query('SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?', [tenTaiKhoan], (err, results) => {
        if (err || results.length === 0) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.');
        }
        const currentHocsinhPassword = results[0].MAT_KHAU;
        // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
        if (currentPassword !== currentHocsinhPassword) {
            return res.status(401).send('Mật khẩu hiện tại không chính xác.');
        }
        // Cập nhật mật khẩu mới
        db.query('UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = ?', [newPassword, tenTaiKhoan], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Có lỗi xảy ra khi cập nhật mật khẩu.');
            }
            res.sendStatus(200); // Trả về thành công
        });
    });
})
// Xử lý logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Có lỗi xảy ra khi đăng xuất.');
        }
        res.redirect('/'); // Chuyển hướng về trang chính hoặc trang đăng nhập
    });
});
// Hiển thị danh mục trường THPT
app.get('/highschool', (req, res) => {
    db.query('SELECT MA_THPT, TEN_THPT, DIA_CHI, CHI_TIEU FROM truong_thpt ORDER BY MA_QUAN_HUYEN', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra trong quá trình truy vấn danh sách trường THPT');
        }
        res.json(results);
    });
})
// Hiển thị tên các trường THPT
app.get('/highschoolName', (req, res) => {
    db.query('SELECT TEN_THPT FROM truong_thpt ORDER BY MA_QUAN_HUYEN', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra trong quá trình truy vấn danh sách trường THPT');
        }
        res.json(results);
    });
})
// Hiển thị danh mục tài khoản (chỉ hiển thị các mục cần thiết)
app.get('/account', (req, res) => {
    db.query('SELECT TEN_TAI_KHOAN, DOI_TUONG, MA_TRUONG FROM TAI_KHOAN', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra trong quá trình truy vấn danh sách tài khoản');
        }
        res.json(results);
    });
})
// Sửa thông tin tài khoản
// Xóa tài khoản
app.delete('/account/{accountName}', (req, res) => {
    const accountName = req.params.accountName;
    db.query('DELETE FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?', [accountName], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Có lỗi xảy ra khi xóa tài khoản');
        }
        res.sendStatus(200); // Trả về thành công
    });
})
// Middleware để sử dụng API routes
app.use('/api', apiRoutes);
// Kiểm tra tồn tại session trong 1 trang
app.get('/api/check-session', (req, res) => {
    if (req.session && req.session.tenTaiKhoan) {
        // Nếu có session đang hoạt động
        res.status(200).send('Session còn hoạt động');
    } else {
        // Nếu không có session
        res.status(401).send('Không có session');
    }
});
// Thêm Swagger
swaggerDocs(app);

// Khởi động server
const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});