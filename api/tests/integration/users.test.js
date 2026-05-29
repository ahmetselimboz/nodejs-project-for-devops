const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app'); // Express uygulamamızı dahil ediyoruz
const Users = require('../../db/models/Users');

let mongoServer;

// Tüm testlerden önce 1 kere çalışır
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 60000);

// Tüm testler bittikten sonra 1 kere çalışır
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Her "it" bloğundan (her testten) sonra çalışır veritabanını temizler
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

describe('Users API Integration Tests', () => {
  
  describe('POST /api/users/register', () => {
    
    it('şifre kurallara uymuyorsa hata dönmelidir (Validation Test)', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: "test@test.com",
          first_name: "Test",
          last_name: "User",
          phone_number: "1234567890",
          password: "123" // Çok kısa bir şifre gönderiyoruz
        });

      // Status kodunun 400 Bad Request olmasını bekliyoruz
      expect(response.status).toBe(400);
      
      // Veritabanına gerçekten kaydedilmediğinden emin olalım
      const userCount = await Users.countDocuments();
      expect(userCount).toBe(0);
    });

    it('doğru bilgiler gönderildiğinde ilk kullanıcıyı Super Admin olarak oluşturmalıdır', async () => {
      const payload = {
        email: "admin@test.com",
        first_name: "Admin",
        last_name: "User",
        phone_number: "05555555555",
        password: "StrongPassword123!" // Yeterli uzunlukta bir şifre
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(payload);

      // Status kodunun 201 Created olmasını bekliyoruz
      expect(response.status).toBe(201);
      
      // Response body'de "başarılı" gibi bir mesaj geldiğini doğrulayabiliriz
      expect(response.body.code).toBe(201);

      // Gerçekten veritabanına kayıt atılmış mı kontrol ediyoruz
      const savedUser = await Users.findOne({ email: payload.email });
      expect(savedUser).not.toBeNull();
      expect(savedUser.first_name).toBe(payload.first_name);
    });

    it('veritabanında zaten bir kullanıcı varsa 404 dönmelidir', async () => {
      // Önce manuel olarak bir kullanıcı ekliyoruz (Mock data hazırlığı)
      await Users.create({
        email: "ilk@test.com",
        password: "hashpassword",
        first_name: "İlk",
        last_name: "Kullanıcı",
        phone_number: "111"
      });

      // Şimdi register endpoint'ine istek atıyoruz
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: "ikinci@test.com",
          first_name: "İkinci",
          last_name: "Kullanıcı",
          phone_number: "222",
          password: "StrongPassword123!"
        });

      // Kodunda "let userExists = await Users.findOne({}); if(userExists) return res.sendStatus(NOT_FOUND)" var.
      // Bu yüzden status 404 olmalı.
      expect(response.status).toBe(404);
    });

  });

});
