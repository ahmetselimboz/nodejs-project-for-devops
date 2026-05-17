const Users = require('../../db/models/Users');
const CustomError = require('../../lib/Error');

describe('User Model - validateFieldsBeforeAuth Birim Testleri', () => {
    it('Parola minimum uzunluktan kısa olduğunda CustomError fırlatmalı', () => {
        expect(() => {
            // 8 karakterden kısa şifre gönderiyoruz
            Users.validateFieldsBeforeAuth('ahmet@test.com', '123', 'TR');
        }).toThrow(CustomError);
    });

    it('Geçersiz e-posta formatı gönderildiğinde CustomError fırlatmalı', () => {
        expect(() => {
            Users.validateFieldsBeforeAuth('gecersiz-email-formati', 'Sifre123!', 'TR');
        }).toThrow(CustomError);
    });

    it('Girdiler doğru formatta olduğunda null döndürmeli', () => {
        const result = Users.validateFieldsBeforeAuth('ahmet@test.com', 'Sifre123!', 'TR');
        expect(result).toBeNull();
    });
});