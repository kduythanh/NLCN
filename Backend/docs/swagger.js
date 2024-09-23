// docs/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Cấu hình các tùy chọn cho Swagger JSDoc
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0', // Phiên bản OpenAPI
    info: {
      title: 'Hệ thống quản lý tuyển sinh lớp 10 THPT',
      version: '1.0.0',
      description: 'Documentation for Hệ thống quản lý tuyển sinh lớp 10 THPT'
    },
    servers: [
      {
        url: 'http://localhost:3000', // URL của server
        description: 'Development server'
      }
    ],
  },
  apis: ['./routes/*.js'], // Đường dẫn đến các file chứa các chú thích Swagger
};

// Tạo tài liệu Swagger từ các chú thích
const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerDocs = (app) => {
  // Cấu hình Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

module.exports = swaggerDocs;
