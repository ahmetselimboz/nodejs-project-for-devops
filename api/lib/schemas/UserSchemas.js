const { z } = require('zod');

// Regex for basic phone number format validation
const phoneRegex = /^\+?[0-9\s\-()]+$/;

// Common schema parts
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Geçersiz ID formatı");

const registerSchema = z.object({
    body: z.object({
        email: z.string().email("Geçersiz e-posta formatı").max(255),
        password: z.string().min(8, "Şifre en az 8 karakter olmalıdır").max(255),
        first_name: z.string().min(1, "İsim gereklidir"),
        last_name: z.string().min(1, "Soyisim gereklidir"),
        phone_number: z.string().regex(phoneRegex, "Geçersiz telefon numarası formatı")
    })
});

const authSchema = z.object({
    body: z.object({
        email: z.string().email("Geçersiz e-posta formatı").max(255),
        password: z.string().min(8, "Şifre en az 8 karakter olmalıdır").max(255)
    })
});

const addSchema = z.object({
    body: z.object({
        email: z.string().email("Geçersiz e-posta formatı").max(255),
        password: z.string().min(8, "Şifre en az 8 karakter olmalıdır").max(255),
        first_name: z.string().min(1, "İsim gereklidir"),
        last_name: z.string().min(1, "Soyisim gereklidir"),
        phone_number: z.string().regex(phoneRegex, "Geçersiz telefon numarası formatı"),
        roles: z.array(objectIdSchema).min(1, "En az bir rol seçilmelidir")
    })
});

const updateSchema = z.object({
    body: z.object({
        _id: objectIdSchema,
        email: z.string().email("Geçersiz e-posta formatı").optional(),
        first_name: z.string().min(1, "İsim boş olamaz").optional(),
        last_name: z.string().min(1, "Soyisim boş olamaz").optional(),
        phone_number: z.string().regex(phoneRegex, "Geçersiz telefon numarası formatı").optional(),
        password: z.string().min(8, "Şifre en az 8 karakter olmalıdır").optional(),
        language: z.string().length(2).optional(),
        roles: z.array(objectIdSchema).optional()
    })
});

const deleteSchema = z.object({
    body: z.object({
        _id: objectIdSchema
    })
});

module.exports = {
    registerSchema,
    authSchema,
    addSchema,
    updateSchema,
    deleteSchema
};
