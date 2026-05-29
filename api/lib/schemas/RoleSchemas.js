const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Geçersiz ID formatı");

const addRoleSchema = z.object({
    body: z.object({
        role_name: z.string().min(1, "Rol adı zorunludur"),
        permissions: z.array(z.string().min(1)).min(1, "En az bir izin seçilmelidir")
    })
});

const updateRoleSchema = z.object({
    body: z.object({
        _id: objectIdSchema,
        role_name: z.string().min(1, "Rol adı zorunludur"),
        is_active: z.boolean().optional(),
        permissions: z.array(z.string().min(1)).optional()
    })
});

const deleteRoleSchema = z.object({
    body: z.object({
        _id: objectIdSchema
    })
});

module.exports = {
    addRoleSchema,
    updateRoleSchema,
    deleteRoleSchema
};
