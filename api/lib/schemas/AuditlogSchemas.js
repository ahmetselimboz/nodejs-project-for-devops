const { z } = require('zod');

const queryAuditlogsSchema = z.object({
    body: z.object({
        skip: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(500).optional(),
        sort: z.record(z.number().int().min(-1).max(1)).optional(),
        select: z.string().optional(),
        populate: z.string().optional(),
        begin_date: z.string().datetime({ offset: true }).optional(),
        end_date: z.string().datetime({ offset: true }).optional()
    }).refine(
        (data) => {
            // If one date is provided, the other must be provided too
            const hasBoth = data.begin_date && data.end_date;
            const hasNeither = !data.begin_date && !data.end_date;
            return hasBoth || hasNeither;
        },
        { message: "Başlangıç ve bitiş tarihi birlikte gönderilmelidir." }
    )
});

module.exports = {
    queryAuditlogsSchema
};
