function success(res, data = null, messageKey = null, statusCode = 200) {
    const body = {success: true};
    if (messageKey) body.message = messageKey;
    if (data !== null) body.data = data;
    return res.status(statusCode).json(body);
}

function paginated(res, data, total, page, limit) {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
        },
    });
}

function error(res, err, t) {
    const status = err.status || 500;
    const message = err.key && t ? t(err.key) : (err.message || 'Internal server error');
    return res.status(status).json({
        success: false,
        errorCode: err.errorCode || 'COMMON_0002',
        message,
        ...(err.details ? {details: err.details} : {}),
    });
}

module.exports = {success, paginated, error};
