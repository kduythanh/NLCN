// server.js
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const swaggerDocs = require("./docs/swagger");
const path = require("path");
const db = require("./config/db");
// // const bcrypt = require('bcryptjs');
// const bodyParser = require('body-parser');
const session = require("express-session");
const { fail } = require("assert");

const app = express();
const port = 3000;

// Middleware để sử dụng CORS
app.use(cors());
// Middleware để xử lý JSON
app.use(express.json());
// Middleware để xử lý dữ liệu url-encoded
app.use(express.urlencoded({ extended: true }));
// Middleware để phục vụ tệp tĩnh từ thư mục Frontend và các thư mục có chứa file HTML cần xử lý
app.use(express.static(path.join(__dirname, "../Frontend")));
app.use(express.static(path.join(__dirname, "../Frontend/roles/admin")));
app.use(express.static(path.join(__dirname, "../Frontend/roles/hdts")));
app.use(express.static(path.join(__dirname, "../Frontend/roles/hocsinh")));
app.use(express.static(path.join(__dirname, "../Frontend/roles/thcs")));
app.use(express.static(path.join(__dirname, "../Frontend/roles/thpt")));
// Cấu hình express-session
app.use(
  session({
    secret: "secret-key", // Thay đổi secret này thành một chuỗi an toàn
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
    },
  })
);

// Cấu hình các route cơ bản
// Route mặc định để trả về homepage.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/homepage.html"));
});

// Xử lý đăng nhập
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM tai_khoan WHERE TEN_TAI_KHOAN = ?",
    [username],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        const user = results[0];
        // const isMatch = bcrypt.compareSync(password, user.MAT_KHAU);
        const isMatch = password === user.MAT_KHAU;
        if (isMatch) {
          const taiKhoan = {
            tenTaiKhoan: user.TEN_TAI_KHOAN,
            matKhau: user.MAT_KHAU,
            doiTuong: user.DOI_TUONG,
            maTruong: user.MA_TRUONG,
          };
          req.session.tenTaiKhoan = taiKhoan.tenTaiKhoan;
          req.session.doiTuong = taiKhoan.doiTuong;
          switch (user.DOI_TUONG) {
            case "admin":
              return res.redirect("/admin");
            case "sgddt":
              return res.redirect("/sgddt");
            case "thcs":
              req.session.maTruong = taiKhoan.maTruong;
              db.query(
                "SELECT TEN_THCS FROM TRUONG_THCS WHERE MA_THCS = ?",
                [taiKhoan.maTruong],
                (error, results) => {
                  if (error) {
                    return res.status(500).send("Lỗi truy vấn database.");
                  }
                  if (results.length > 0) {
                    req.session.tenTruong = results[0].TEN_THCS;
                    return res.redirect("/thcs");
                  } else {
                    return res.status(404).send("Không tìm thấy trường.");
                  }
                }
              );
              break;
            case "thpt":
              req.session.maTruong = taiKhoan.maTruong;
              db.query(
                "SELECT TEN_THPT FROM TRUONG_THPT WHERE MA_THPT = ?",
                [taiKhoan.maTruong],
                (error, results) => {
                  if (error) {
                    return res.status(500).send("Lỗi truy vấn database.");
                  }
                  if (results.length > 0) {
                    req.session.tenTruong = results[0].TEN_THPT;
                    return res.redirect("/thpt");
                  } else {
                    return res.status(404).send("Không tìm thấy trường.");
                  }
                }
              );
              break;
            default:
              req.session.maHocSinh = taiKhoan.tenTaiKhoan;
              db.query(
                "SELECT HO_TEN_HOC_SINH FROM HOC_SINH WHERE MA_HOC_SINH = ?",
                [taiKhoan.tenTaiKhoan],
                (error, results) => {
                  if (error) {
                    return res.status(500).send("Lỗi truy vấn database.");
                  }
                  if (results.length > 0) {
                    req.session.tenHocSinh = results[0].HO_TEN_HOC_SINH;
                    return res.redirect("/hocsinh");
                  } else {
                    return res.status(404).send("Không tìm thấy học sinh.");
                  }
                }
              );
              break;
          }
        } else {
          res.status(401).json({
            status: fail,
            message: "Mật khẩu nhập vào không chính xác, vui lòng nhập lại!",
          });
        }
      } else {
        res
          .status(401)
          .json({ status: fail, message: "Tài khoản không tồn tại!" });
      }
    }
  );
});

// Các giao diện tương ứng
app.get("/admin", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "admin") {
    res.sendFile(path.join(__dirname, "../Frontend/roles/admin/admin.html"));
  } else {
    res.send("Bạn không có quyền truy cập");
  }
});
app.get("/api/admin", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "admin") {
    console.log("Session hiện tại:", req.session);
    res.json({
      tenTaiKhoan: req.session.tenTaiKhoan,
      doiTuong: req.session.doiTuong,
    });
  } else {
    res.send("Bạn không có quyền truy cập");
  }
});
// Đổi mật khẩu của account Admin
app.put("/admin", (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  // Kiểm tra mật khẩu xác nhận
  if (newPassword !== confirmNewPassword) {
    return res.status(400).send("Mật khẩu xác nhận không khớp.");
  }
  // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
  db.query(
    'SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = "admin"',
    (err, results) => {
      if (err || results.length === 0) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.");
      }
      const currentAdminPassword = results[0].MAT_KHAU;
      // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
      if (currentPassword !== currentAdminPassword) {
        return res.status(401).send("Mật khẩu hiện tại không chính xác.");
      }
      // Cập nhật mật khẩu mới
      db.query(
        'UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = "admin"',
        [newPassword],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Có lỗi xảy ra khi cập nhật mật khẩu.");
          }
          res.sendStatus(200); // Trả về thành công
        }
      );
    }
  );
});
// Xử lý đăng nhập của sở GDĐT (Hội đồng tuyển sinh)
app.get("/sgddt", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "sgddt") {
    res.sendFile(path.join(__dirname, "../Frontend/roles/hdts/hdts.html"));
  } else {
    res.redirect("/");
  }
});
app.get("/api/hdts", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "sgddt") {
    console.log("Session hiện tại:", req.session);
    res.json({
      tenTaiKhoan: req.session.tenTaiKhoan,
      doiTuong: req.session.doiTuong,
    });
  } else {
    res.send("Bạn không có quyền truy cập");
  }
});
// Đổi mật khẩu của account HĐTS
app.put("/hdts", (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  // Kiểm tra mật khẩu xác nhận
  if (newPassword !== confirmNewPassword) {
    return res.status(400).send("Mật khẩu xác nhận không khớp.");
  }
  const tenTaiKhoan = req.session.tenTaiKhoan;
  // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
  db.query(
    'SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = "sgddt"',
    (err, results) => {
      if (err || results.length === 0) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.");
      }
      const currentHDTSPassword = results[0].MAT_KHAU;
      // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
      if (currentPassword !== currentHDTSPassword) {
        return res.status(401).send("Mật khẩu hiện tại không chính xác.");
      }
      // Cập nhật mật khẩu mới
      db.query(
        'UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = "sgddt"',
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Có lỗi xảy ra khi cập nhật mật khẩu.");
          }
          res.sendStatus(200); // Trả về thành công
        }
      );
    }
  );
});
// Xử lý đăng nhập account trường THCS
app.get("/thcs", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "thcs") {
    res.sendFile(path.join(__dirname, "../Frontend/roles/thcs/thcs.html"));
  } else {
    res.redirect("/");
  }
});
app.get("/api/thcs", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "thcs") {
    console.log("Session hiện tại:", req.session);
    res.json({
      tenTaiKhoan: req.session.tenTaiKhoan,
      doiTuong: req.session.doiTuong,
      tenTruong: req.session.tenTruong,
      maTruong: req.session.maTruong,
    });
  } else {
    res.send("Bạn không có quyền truy cập");
  }
});
app.put("/thcs", (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  // Kiểm tra mật khẩu xác nhận
  if (newPassword !== confirmNewPassword) {
    return res.status(400).send("Mật khẩu xác nhận không khớp.");
  }
  const tenTaiKhoan = req.session.tenTaiKhoan;
  // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
  db.query(
    "SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?",
    [tenTaiKhoan],
    (err, results) => {
      if (err || results.length === 0) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.");
      }
      const currentTHCSPassword = results[0].MAT_KHAU;
      // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
      if (currentPassword !== currentTHCSPassword) {
        return res.status(401).send("Mật khẩu hiện tại không chính xác.");
      }
      // Cập nhật mật khẩu mới
      db.query(
        "UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = ?",
        [newPassword, tenTaiKhoan],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Có lỗi xảy ra khi cập nhật mật khẩu.");
          }
          res.sendStatus(200); // Trả về thành công
        }
      );
    }
  );
});
app.get("/thpt", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "thpt") {
    res.sendFile(path.join(__dirname, "../Frontend/roles/thpt/thpt.html"));
  } else {
    res.redirect("/");
  }
});
app.get("/api/thpt", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "thpt") {
    console.log("Session hiện tại:", req.session);
    res.json({
      tenTaiKhoan: req.session.tenTaiKhoan,
      doiTuong: req.session.doiTuong,
      tenTruong: req.session.tenTruong,
      maTruong: req.session.maTruong,
    });
  } else {
    res.send("Bạn không có quyền truy cập");
  }
});
app.put("/thpt", (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  // Kiểm tra mật khẩu xác nhận
  if (newPassword !== confirmNewPassword) {
    return res.status(400).send("Mật khẩu xác nhận không khớp.");
  }
  const tenTaiKhoan = req.session.tenTaiKhoan;
  // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
  db.query(
    "SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?",
    [tenTaiKhoan],
    (err, results) => {
      if (err || results.length === 0) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.");
      }
      const currentTHPTassword = results[0].MAT_KHAU;
      // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
      if (currentPassword !== currentTHPTPassword) {
        return res.status(401).send("Mật khẩu hiện tại không chính xác.");
      }
      // Cập nhật mật khẩu mới
      db.query(
        "UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = ?",
        [newPassword, tenTaiKhoan],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Có lỗi xảy ra khi cập nhật mật khẩu.");
          }
          res.sendStatus(200); // Trả về thành công
        }
      );
    }
  );
});
app.get("/thpt/hocsinh", (req, res) => {
  const maTHPT = req.session.maTruong;
  db.query(
    `SELECT NV.*, hoc_sinh.HO_TEN_HOC_SINH, hoc_sinh.GIOI_TINH, hoc_sinh.NGAY_SINH, TEN_THCS FROM nguyen_vong NV
    JOIN (SELECT MA_HOC_SINH, MIN(THU_TU) AS NVMAX FROM nguyen_vong GROUP BY MA_HOC_SINH) AS NVCN 
    ON NV.MA_HOC_SINH = NVCN.MA_HOC_SINH AND NV.THU_TU = NVCN.NVMAX 
    JOIN hoc_sinh ON NV.MA_HOC_SINH = hoc_sinh.MA_HOC_SINH 
    JOIN TRUONG_THCS ON hoc_sinh.MA_THCS = TRUONG_THCS.MA_THCS WHERE MA_THPT = ?
    ORDER BY SUBSTRING_INDEX(hoc_sinh.HO_TEN_HOC_SINH, ' ', -1), HO_TEN_HOC_SINH, NGAY_SINH`,
    [maTHPT],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình truy vấn thông tin học sinh");
      }
      res.json(results);
    }
  );
});
app.post("/thpt/thisinh", (req, res) => {
  const maTHPT = req.session.maTruong;

  // Lấy danh sách học sinh đăng ký vào trường từ câu lệnh bạn đã có
  db.query(
    `SELECT NV.*, hoc_sinh.MA_HOC_SINH, hoc_sinh.HO_TEN_HOC_SINH, hoc_sinh.GIOI_TINH, hoc_sinh.NGAY_SINH, TEN_THCS
    FROM nguyen_vong NV
    JOIN (SELECT MA_HOC_SINH, MIN(THU_TU) AS NVMAX FROM nguyen_vong GROUP BY MA_HOC_SINH) AS NVCN 
    ON NV.MA_HOC_SINH = NVCN.MA_HOC_SINH AND NV.THU_TU = NVCN.NVMAX 
    JOIN hoc_sinh ON NV.MA_HOC_SINH = hoc_sinh.MA_HOC_SINH 
    JOIN TRUONG_THCS ON hoc_sinh.MA_THCS = TRUONG_THCS.MA_THCS
    WHERE NV.MA_THPT = ?
    ORDER BY SUBSTRING_INDEX(hoc_sinh.HO_TEN_HOC_SINH, ' ', -1), HO_TEN_HOC_SINH, NGAY_SINH`,
    [maTHPT],
    (err, students) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình truy vấn thông tin học sinh");
      }

      // Tạo một danh sách các promise để xử lý cập nhật/insert song song
      const queries = students.map((student) => {
        return new Promise((resolve, reject) => {
          db.query(
            "INSERT IGNORE INTO thi_sinh (MA_HOC_SINH, MA_THPT) VALUES (?, ?)",
            [student.MA_HOC_SINH, maTHPT],
            (err, results) => {
              if (err) reject(err);
              else resolve(results);
            }
          );
        });
      });

      // Thực hiện tất cả các truy vấn
      Promise.all(queries)
        .then(() => {
          res.send("Cập nhật danh sách thí sinh thành công!");
        })
        .catch((error) => {
          console.error(error);
          res.status(500).send("Có lỗi xảy ra khi cập nhật danh sách thí sinh");
        });
    }
  );
});
app.patch("/thpt/sbd", async (req, res) => {
  const maTHPT = req.session.maTruong;

  try {
    // Bước 1: Xóa số báo danh hiện có cho tất cả các thí sinh của trường
    await db
      .promise()
      .query("UPDATE thi_sinh SET SO_BAO_DANH = NULL WHERE MA_THPT = ?", [
        maTHPT,
      ]);

    // Bước 2: Lấy danh sách thí sinh sắp xếp theo tên (dựa trên tên cuối cùng trong họ tên)
    const [students] = await db.promise().query(
      `SELECT hoc_sinh.MA_HOC_SINH, hoc_sinh.HO_TEN_HOC_SINH 
       FROM hoc_sinh 
       JOIN thi_sinh ON hoc_sinh.MA_HOC_SINH = thi_sinh.MA_HOC_SINH
       WHERE thi_sinh.MA_THPT = ? 
       ORDER BY SUBSTRING_INDEX(hoc_sinh.HO_TEN_HOC_SINH, ' ', -1), hoc_sinh.HO_TEN_HOC_SINH`,
      [maTHPT]
    );

    // Bước 3: Đánh số báo danh theo quy tắc
    const soBaoDanhList = students.map((student, index) => {
      const soBaoDanh = `${maTHPT}${String(index + 1).padStart(4, "0")}`;
      return [soBaoDanh, student.MA_HOC_SINH];
    });

    // Bước 4: Cập nhật số báo danh vào bảng thi_sinh
    await Promise.all(
      soBaoDanhList.map(([soBaoDanh, maHocSinh]) =>
        db
          .promise()
          .query(
            "UPDATE thi_sinh SET SO_BAO_DANH = ? WHERE MA_HOC_SINH = ? AND MA_THPT = ?",
            [soBaoDanh, maHocSinh, maTHPT]
          )
      )
    );

    res.send("Cập nhật số báo danh thành công cho các thí sinh!");
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("Có lỗi xảy ra khi cập nhật số báo danh cho thí sinh.");
  }
});

// Xử lý đăng nhập của học sinh
app.get("/hocsinh", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "hocsinh") {
    res.sendFile(
      path.join(__dirname, "../Frontend/roles/hocsinh/hocsinh.html")
    );
  } else {
    res.redirect("/");
  }
});
app.get("/api/hocsinh", (req, res) => {
  if (req.session.tenTaiKhoan && req.session.doiTuong === "hocsinh") {
    res.json({
      tenTaiKhoan: req.session.tenTaiKhoan,
      doiTuong: req.session.doiTuong,
      tenHocSinh: req.session.tenHocSinh,
      maHocSinh: req.session.maHocSinh,
    });
  } else {
    res.send("Bạn không có quyền truy cập");
  }
});
app.get("/hocsinh/:hocsinhId", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  db.query(
    "SELECT * FROM HOC_SINH JOIN DT_UU_TIEN ON HOC_SINH.MA_DT_UU_TIEN = DT_UU_TIEN.MA_DT_UU_TIEN JOIN DT_KHUYEN_KHICH ON HOC_SINH.MA_DT_KHUYEN_KHICH = DT_KHUYEN_KHICH.MA_DT_KHUYEN_KHICH JOIN TRUONG_THCS ON HOC_SINH.MA_THCS = TRUONG_THCS.MA_THCS WHERE MA_HOC_SINH = ?",
    [hocsinhId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình truy vấn thông tin học sinh");
      }
      if (results.length === 0) {
        return res.status(404).send("Không tìm thấy học sinh");
      }
      res.json(results[0]);
    }
  );
});
app.get("/hocsinh/:hocsinhId/kqht/:lop", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  const lop = req.params.lop;
  db.query(
    "SELECT * FROM KQ_HOC_TAP WHERE MA_HOC_SINH = ? AND LOP = ?",
    [hocsinhId, lop],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send(
            "Có lỗi xảy ra trong quá trình truy vấn kết quả học tập học sinh"
          );
      }
      if (results.length === 0) {
        return res.status(404).send("Không tìm thấy thông tin");
      }
      res.json(results[0]);
    }
  );
});
app.get("/hocsinh/:hocsinhId/nguyenvong/:nv", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  const nv = req.params.nv;

  db.query(
    "SELECT NGUYEN_VONG.MA_THPT, TEN_THPT, LOP_CHUYEN, MON_CHUYEN FROM NGUYEN_VONG JOIN TRUONG_THPT ON NGUYEN_VONG.MA_THPT = TRUONG_THPT.MA_THPT WHERE MA_HOC_SINH = ? AND THU_TU = ?",
    [hocsinhId, nv],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình tra cứu nguyện vọng");
      }
      // Kiểm tra xem có kết quả nào không
      if (results.length === 0) {
        // Trả về null nếu không tìm thấy
        return res.json(null);
      }
      // Trả về kết quả nếu tìm thấy
      res.json(results[0]);
    }
  );
});
// Đổi mật khẩu của account Học sinh
app.put("/hocsinh", (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  // Kiểm tra mật khẩu xác nhận
  if (newPassword !== confirmNewPassword) {
    return res.status(400).send("Mật khẩu xác nhận không khớp.");
  }
  const tenTaiKhoan = req.session.tenTaiKhoan;
  // Kiểm tra mật khẩu hiện tại (có thể cần truy vấn để xác minh)
  db.query(
    "SELECT MAT_KHAU FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?",
    [tenTaiKhoan],
    (err, results) => {
      if (err || results.length === 0) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra khi kiểm tra mật khẩu hiện tại.");
      }
      const currentHocsinhPassword = results[0].MAT_KHAU;
      // Kiểm tra mật khẩu hiện tại (so sánh với mật khẩu từ cơ sở dữ liệu)
      if (currentPassword !== currentHocsinhPassword) {
        return res.status(401).send("Mật khẩu hiện tại không chính xác.");
      }
      // Cập nhật mật khẩu mới
      db.query(
        "UPDATE TAI_KHOAN SET MAT_KHAU = ? WHERE TEN_TAI_KHOAN = ?",
        [newPassword, tenTaiKhoan],
        (err) => {
          if (err) {
            console.error(err);
            return res.status(500).send("Có lỗi xảy ra khi cập nhật mật khẩu.");
          }
          res.sendStatus(200); // Trả về thành công
        }
      );
    }
  );
});
// Xử lý logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Có lỗi xảy ra khi đăng xuất.");
    }
    res.redirect("/"); // Chuyển hướng về trang chính hoặc trang đăng nhập
  });
});
// Hiển thị danh mục trường THCS
app.get("/secondaryschool", (req, res) => {
  db.query(
    "SELECT MA_THCS, TEN_THCS, MA_QUAN_HUYEN FROM truong_thcs ORDER BY MA_QUAN_HUYEN",
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình truy vấn danh sách trường THCS");
      }
      res.json(results);
    }
  );
});
// Hiển thị danh mục trường THPT
app.get("/highschool", (req, res) => {
  db.query(
    "SELECT MA_THPT, TEN_THPT, DIA_CHI, CHI_TIEU FROM truong_thpt ORDER BY MA_QUAN_HUYEN",
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình truy vấn danh sách trường THPT");
      }
      res.json(results);
    }
  );
});
// Hiển thị tên các trường THPT
app.get("/highschoolName", (req, res) => {
  db.query(
    "SELECT TEN_THPT FROM truong_thpt ORDER BY MA_QUAN_HUYEN",
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình truy vấn danh sách trường THPT");
      }
      res.json(results);
    }
  );
});
// Hiển thị danh mục tài khoản (chỉ hiển thị các mục cần thiết)
app.get("/account", (req, res) => {
  db.query(
    "SELECT TEN_TAI_KHOAN, DOI_TUONG, MA_TRUONG FROM TAI_KHOAN ORDER BY DOI_TUONG",
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình truy vấn danh sách tài khoản");
      }
      res.json(results);
    }
  );
});
// Thêm tài khoản
app.post("/account", (req, res) => {
  const { tenTaiKhoan, matKhau, doiTuong, maTruong } = req.body;
  db.query(
    "INSERT INTO TAI_KHOAN VALUES (?, ?, ?, ?)",
    [tenTaiKhoan, matKhau, doiTuong, maTruong],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Có lỗi xảy ra khi thêm tài khoản");
      }
      res.sendStatus(200); // Trả về thành công
    }
  );
});
// Xóa tài khoản
app.delete("/account/{accountName}", (req, res) => {
  const accountName = req.params.accountName;
  db.query(
    "DELETE FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?",
    [accountName],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Có lỗi xảy ra khi xóa tài khoản");
      }
      res.sendStatus(200); // Trả về thành công
    }
  );
});
// Lấy danh sách hồ sơ học sinh ở trường THCS
app.get("/thcs/hocsinh", (req, res) => {
  if (req.session.doiTuong === "thcs") {
    db.query(
      "SELECT MA_HOC_SINH, HO_TEN_HOC_SINH, GIOI_TINH, NGAY_SINH, timNguyenVong(MA_HOC_SINH, 1) NV1, timLopChuyen(MA_HOC_SINH) LOP_CHUYEN, timMonChuyen(MA_HOC_SINH) MON_CHUYEN, timNguyenVong(MA_HOC_SINH, 2) NV2, timNguyenVong(MA_HOC_SINH, 3) NV3, timNguyenVong(MA_HOC_SINH, 4) NV4, timNguyenVong(MA_HOC_SINH, 5) NV5 FROM HOC_SINH WHERE MA_THCS = ?",
      [req.session.maTruong],
      (err, results) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .send("Có lỗi xảy ra trong quá trình truy vấn danh sách học sinh");
        }
        res.json(results);
      }
    );
  }
});
app.post("/thcs/account", (req, res) => {
  if (req.session.doiTuong === "thcs") {
    const maTruong = req.session.maTruong;

    // Truy vấn danh sách học sinh của trường
    db.query(
      "SELECT MA_HOC_SINH FROM HOC_SINH WHERE MA_THCS = ?",
      [maTruong],
      (err, students) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Lỗi khi truy vấn học sinh");
        }

        // Duyệt qua danh sách học sinh và tạo tài khoản nếu chưa tồn tại
        const queries = students.map((student) => {
          const maHocSinh = student.MA_HOC_SINH;
          const password = maHocSinh; // Mật khẩu là mã học sinh
          const query = `
            INSERT INTO TAI_KHOAN (TEN_TAI_KHOAN, MAT_KHAU, DOI_TUONG, MA_TRUONG)
            SELECT ?, ?, 'hocsinh', ?
            WHERE NOT EXISTS (
              SELECT 1 FROM TAI_KHOAN WHERE TEN_TAI_KHOAN = ?
            )
          `;
          return db
            .promise()
            .query(query, [maHocSinh, password, maTruong, maHocSinh]);
        });

        // Thực hiện tất cả các truy vấn
        Promise.all(queries)
          .then(() =>
            res.send("Cấp tài khoản thành công cho học sinh chưa có tài khoản!")
          )
          .catch((error) => {
            console.error(error);
            res.status(500).send("Lỗi khi cấp tài khoản cho học sinh");
          });
      }
    );
  } else {
    res.status(403).send("Bạn không có quyền thực hiện thao tác này");
  }
});

// Lấy hồ sơ chi tiết của 1 học sinh
app.get("/thcs/hocsinh/:hocsinhId", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  db.query(
    "SELECT * FROM HOC_SINH JOIN DT_UU_TIEN ON HOC_SINH.MA_DT_UU_TIEN = DT_UU_TIEN.MA_DT_UU_TIEN JOIN DT_KHUYEN_KHICH ON HOC_SINH.MA_DT_KHUYEN_KHICH = DT_KHUYEN_KHICH.MA_DT_KHUYEN_KHICH JOIN TRUONG_THCS ON HOC_SINH.MA_THCS = TRUONG_THCS.MA_THCS WHERE MA_HOC_SINH = ?",
    [hocsinhId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình truy vấn thông tin học sinh");
      }
      if (results.length === 0) {
        return res.status(404).send("Không tìm thấy học sinh");
      }
      res.json(results[0]);
    }
  );
});
app.get("/thcs/hocsinh/:hocsinhId/kqht/:lop", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  const lop = req.params.lop;
  db.query(
    "SELECT * FROM KQ_HOC_TAP WHERE MA_HOC_SINH = ? AND LOP = ?",
    [hocsinhId, lop],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send(
            "Có lỗi xảy ra trong quá trình truy vấn kết quả học tập học sinh"
          );
      }
      if (results.length === 0) {
        return res.status(404).send("Không tìm thấy thông tin");
      }
      res.json(results[0]);
    }
  );
});
app.post("/thcs/hocsinh/kqht/:lop", (req, res) => {
  const lop = req.params.lop;
  const { MSHS, HL, HK } = req.body;

  db.query(
    "INSERT INTO KQ_HOC_TAP VALUES (?, ?, ?, ?)",
    [MSHS, lop, HL, HK],
    (err, results) => {
      if (err) {
        console.error("Lỗi khi thêm kết quả học tập:", err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình thêm kết quả học tập");
      }
      // Gửi phản hồi thành công
      return res
        .status(201)
        .json({ message: "Thêm kết quả học tập thành công!", results });
    }
  );
});

app.post("/thcs/hocsinh", (req, res) => {
  const maTruong = req.session.maTruong;
  const {
    MSHS,
    HoTenHS,
    gender,
    NgaySinh,
    NoiSinh,
    HKTT,
    COHN,
    NamTotNghiep,
    NgoaiNgu,
    NgoaiNguDuThi,
    DienThoai,
    DanToc,
    DTUuTien,
    DTKhuyenKhich,
  } = req.body;
  try {
    let MaDTUuTien, MaDTKhuyenKhich;

    const q1 = "SELECT MA_DT_UU_TIEN FROM DT_UU_TIEN WHERE TEN_DT_UU_TIEN = ?";

    db.promise()
      .query(q1, [DTUuTien])
      .then(([results]) => {
        if (results.length === 0) {
          return res.status(400).json({ error: "Không tìm thấy loại ưu tiên" });
        }

        MaDTUuTien = results[0].MA_DT_UU_TIEN;

        const q2 =
          "SELECT MA_DT_KHUYEN_KHICH FROM DT_KHUYEN_KHICH WHERE TEN_DT_KHUYEN_KHICH = ?";

        return db
          .promise()
          .query(q2, [DTKhuyenKhich])
          .then(([rows]) => {
            if (rows.length === 0) {
              return res
                .status(400)
                .json({ error: "Không tìm thấy khuyến khích" });
            }

            MaDTKhuyenKhich = rows[0].MA_DT_KHUYEN_KHICH;

            const query = `INSERT INTO HOC_SINH VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const values = [
              MSHS,
              HoTenHS,
              gender,
              NgaySinh,
              NoiSinh,
              HKTT,
              COHN,
              NamTotNghiep,
              NgoaiNgu,
              NgoaiNguDuThi,
              DienThoai,
              maTruong,
              DanToc,
              MaDTUuTien,
              MaDTKhuyenKhich,
            ];
            return db.promise().query(query, values);
          });
      })
      .then(() => {
        return res.status(201).json({ message: "Thêm học sinh thành công!" });
      })
      .catch((error) => {
        console.error("Lỗi khi thêm học sinh:", error);
        if (!res.headersSent) {
          return res
            .status(500)
            .json({ error: "Lỗi trong quá trình thêm học sinh!" });
        }
      });
  } catch (error) {
    console.error("Lỗi không mong muốn:", error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ error: "Lỗi trong quá trình thêm học sinh!" });
    }
  }
});
app.patch("/thcs/hocsinh/:hocsinhId", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  const maTruong = req.session.maTruong;
  const {
    MSHS,
    HoTenHS,
    gender,
    NgaySinh,
    NoiSinh,
    HKTT,
    COHN,
    NamTotNghiep,
    NgoaiNgu,
    NgoaiNguDuThi,
    DienThoai,
    DanToc,
    DTUuTien,
    DTKhuyenKhich,
  } = req.body;
  try {
    let MaDTUuTien, MaDTKhuyenKhich;

    const q1 = "SELECT MA_DT_UU_TIEN FROM DT_UU_TIEN WHERE TEN_DT_UU_TIEN = ?";

    db.promise()
      .query(q1, [DTUuTien])
      .then(([results]) => {
        if (results.length === 0) {
          return res.status(400).json({ error: "Không tìm thấy loại ưu tiên" });
        }

        MaDTUuTien = results[0].MA_DT_UU_TIEN;

        const q2 =
          "SELECT MA_DT_KHUYEN_KHICH FROM DT_KHUYEN_KHICH WHERE TEN_DT_KHUYEN_KHICH = ?";

        return db
          .promise()
          .query(q2, [DTKhuyenKhich])
          .then(([rows]) => {
            if (rows.length === 0) {
              return res
                .status(400)
                .json({ error: "Không tìm thấy khuyến khích" });
            }

            MaDTKhuyenKhich = rows[0].MA_DT_KHUYEN_KHICH;

            const query = `UPDATE HOC_SINH SET HO_TEN_HOC_SINH = ?, GIOI_TINH = ?, NGAY_SINH = ?, NOI_SINH = ?, HO_KHAU_THUONG_TRU = ?, CHO_O_HIEN_NAY = ?, NAM_TOT_NGHIEP_THCS = ?, NGOAI_NGU_DANG_HOC = ?, NGOAI_NGU_DU_THI = ?, SO_DIEN_THOAI = ?, MA_THCS = ?, TEN_DAN_TOC = ?, MA_DT_UU_TIEN = ?, MA_DT_KHUYEN_KHICH = ? WHERE MA_HOC_SINH = ?`;
            const values = [
              HoTenHS,
              gender,
              NgaySinh,
              NoiSinh,
              HKTT,
              COHN,
              NamTotNghiep,
              NgoaiNgu,
              NgoaiNguDuThi,
              DienThoai,
              maTruong,
              DanToc,
              MaDTUuTien,
              MaDTKhuyenKhich,
              MSHS,
            ];
            return db.promise().query(query, values);
          });
      })
      .then(() => {
        return res
          .status(201)
          .json({ message: "Cập nhật học sinh thành công!" });
      })
      .catch((error) => {
        console.error("Lỗi khi cập nhật học sinh:", error);
        if (!res.headersSent) {
          return res
            .status(500)
            .json({ error: "Lỗi trong quá trình cập nhật học sinh!" });
        }
      });
  } catch (error) {
    console.error("Lỗi không mong muốn:", error);
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ error: "Lỗi trong quá trình thêm học sinh!" });
    }
  }
});
app.patch("/thcs/hocsinh/:hocsinhId/kqht/:lop", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  const lop = req.params.lop;
  const { HL, HK } = req.body;

  db.query(
    "UPDATE KQ_HOC_TAP SET HOC_LUC = ?, HANH_KIEM = ? WHERE MA_HOC_SINH = ? AND LOP = ?",
    [HL, HK, hocsinhId, lop],
    (err, results) => {
      if (err) {
        console.error("Lỗi khi cập nhật kết quả học tập:", err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình cập nhật kết quả học tập");
      }
      // Gửi phản hồi thành công
      return res
        .status(201)
        .json({ message: "Cập nhật kết quả học tập thành công!", results });
    }
  );
});
app.delete("/thcs/hocsinh/:hocsinhId", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  db.query(
    "DELETE FROM HOC_SINH WHERE MA_HOC_SINH = ?",
    [hocsinhId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình xóa thông tin học sinh");
      }
      res.status(200).send("Xóa hồ sơ thành công");
    }
  );
});
app.delete("/thcs/hocsinh/:hocsinhId/kqht", (req, res) => {
  const hocsinhId = req.params.hocsinhId;

  db.query(
    "DELETE FROM KQ_HOC_TAP WHERE MA_HOC_SINH = ?",
    [hocsinhId],
    (err, results) => {
      if (err) {
        console.error("Lỗi khi xóa kết quả học tập:", err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình xóa kết quả học tập");
      }
      // Gửi phản hồi thành công
      return res
        .status(201)
        .json({ message: "Xóa kết quả học tập thành công!", results });
    }
  );
});
app.post("/thcs/hocsinh/:hocsinhId/nguyenvong/1", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  const { LOP_CHUYEN, MON_CHUYEN } = req.body;
  db.query(
    "INSERT INTO NGUYEN_VONG VALUES (?, '13', 1, ?, ?)",
    [hocsinhId, LOP_CHUYEN, MON_CHUYEN],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình thêm nguyện vọng");
      }
      return res
        .status(201)
        .json({ message: "Thêm nguyện vọng 1 thành công!", results });
    }
  );
});
app.post("/thcs/hocsinh/:hocsinhId/nguyenvong/:nv", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  const nv = req.params.nv;
  const { MA_TRUONG } = req.body;
  db.query(
    "INSERT INTO NGUYEN_VONG VALUES (?, ?, ?, '', '')",
    [hocsinhId, MA_TRUONG, nv],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình thêm nguyện vọng");
      }
      return res
        .status(201)
        .json({ message: "Thêm nguyện vọng thành công!", results });
    }
  );
});
app.delete("/thcs/hocsinh/:hocsinhId/nguyenvong", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  db.query(
    "DELETE FROM NGUYEN_VONG WHERE MA_HOC_SINH = ?",
    [hocsinhId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình xóa nguyện vọng");
      }
      return res
        .status(201)
        .json({ message: "Xóa nguyện vọng thành công!", results });
    }
  );
});
app.get("/thcs/hocsinh/:hocsinhId/nguyenvong/:nv", (req, res) => {
  const hocsinhId = req.params.hocsinhId;
  const nv = req.params.nv;

  db.query(
    "SELECT NGUYEN_VONG.MA_THPT, TEN_THPT, LOP_CHUYEN, MON_CHUYEN FROM NGUYEN_VONG JOIN TRUONG_THPT ON NGUYEN_VONG.MA_THPT = TRUONG_THPT.MA_THPT WHERE MA_HOC_SINH = ? AND THU_TU = ?",
    [hocsinhId, nv],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Có lỗi xảy ra trong quá trình tra cứu nguyện vọng");
      }
      // Kiểm tra xem có kết quả nào không
      if (results.length === 0) {
        // Trả về null nếu không tìm thấy
        return res.json(null);
      }
      // Trả về kết quả nếu tìm thấy
      res.json(results[0]);
    }
  );
});

app.get("/dantoc", (req, res) => {
  db.query("SELECT * FROM DAN_TOC", (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .send("Có lỗi xảy ra trong quá trình truy vấn danh sách dân tộc");
    }
    res.json(results);
  });
});
app.get("/dtuutien", (req, res) => {
  db.query("SELECT * FROM DT_UU_TIEN", (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .send(
          "Có lỗi xảy ra trong quá trình truy vấn danh sách đối tượng ưu tiên"
        );
    }
    res.json(results);
  });
});
app.get("/dtkhuyenkhich", (req, res) => {
  db.query("SELECT * FROM DT_KHUYEN_KHICH", (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .send(
          "Có lỗi xảy ra trong quá trình truy vấn danh sách đối tượng khuyến khích"
        );
    }
    res.json(results);
  });
});
// Middleware để sử dụng API routes
app.use("/api", apiRoutes);
// Kiểm tra tồn tại session trong 1 trang
app.get("/api/check-session", (req, res) => {
  if (req.session && req.session.tenTaiKhoan) {
    // Nếu có session đang hoạt động
    res.status(200).send("Session còn hoạt động");
  } else {
    // Nếu không có session
    res.status(401).send("Không có session");
  }
});
// Thêm Swagger
swaggerDocs(app);

// Khởi động server
const server = app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
