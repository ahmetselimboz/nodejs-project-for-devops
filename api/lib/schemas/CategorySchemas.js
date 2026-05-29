const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Geçersiz ID formatı");

const addCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, "Kategori adı zorunludur")
    })
});

const updateCategorySchema = z.object({
    body: z.object({
        _id: objectIdSchema,
        name: z.string().min(1, "Kategori adı zorunludur"),
        is_active: z.boolean().optional()
    })
});

const deleteCategorySchema = z.object({
    body: z.object({
        _id: objectIdSchema
    })
});

module.exports = {
    addCategorySchema,
    updateCategorySchema,
    deleteCategorySchema
};
