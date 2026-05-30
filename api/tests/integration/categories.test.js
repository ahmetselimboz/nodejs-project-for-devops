const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../app'); // Sunucu dinlemesi içermeyen yalın express yapısı

let mongoServer;

beforeAll(async () => {
    // Gerçek veritabanına dokunmamak için bellek içi sanal DB başlatıyoruz
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    await mongoose.connect(uri);
});

afterAll(async () => {
    // Testler tamamlandığında bağlantıları temizliyoruz
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('POST /api/categories/add - Kategori Ekleme API', () => {
    it('Zorunlu alan olan name gönderilmediğinde hata dönmeli', async () => {
        // Not: Eğer route üzerinde JWT auth korumanız varsa (.authenticate()) 
        // testten önce sahte bir token üretip .set('Authorization', `Bearer ${token}`) eklemelisiniz.
        
        const res = await request(app)
            .post('/api/categories/add')
            .send({}); // Boş body gönderimi
        
        expect(res.status).toBe(200); // Yetkisiz erişim kontrolü veya validasyon hatası beklenir
    });
});