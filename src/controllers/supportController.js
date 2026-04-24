const { SupportTicket, SupportMessage, Customer, Device, User } = require('../models/postgres/index');
const { AppError } = require('../errors/codes');
const { success, paginated } = require('../utils/response');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, status, priority, customer_id } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (customer_id) where.customer_id = customer_id;
    if (req.user.role === 'dealer') {
      const customers = await Customer.findAll({
        where: { dealer_id: req.user.dealer_id },
        attributes: ['id'],
      });
      where.customer_id = customers.map((c) => c.id);
    }

    const { count, rows } = await SupportTicket.findAndCountAll({
      where,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: Device, as: 'device', attributes: ['id', 'serial_no', 'model'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
      ],
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    return paginated(res, rows, count, page, limit);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name'] },
        { model: Device, as: 'device', attributes: ['id', 'serial_no', 'model'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] },
        {
          model: SupportMessage,
          as: 'messages',
          order: [['created_at', 'ASC']],
        },
      ],
    });
    if (!ticket) throw new AppError('SUPPORT_5001');
    return success(res, ticket);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const ticket = await SupportTicket.create({
      ...req.body,
      created_by: req.user.id,
    });
    return success(res, ticket, req.t('support.created'), 201);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) throw new AppError('SUPPORT_5001');

    if (req.body.status === 'closed' && ticket.status !== 'closed') {
      req.body.closed_at = new Date();
    }

    await ticket.update(req.body);
    return success(res, ticket, req.t('support.updated'));
  } catch (err) {
    next(err);
  }
}

async function addMessage(req, res, next) {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) throw new AppError('SUPPORT_5001');
    if (ticket.status === 'closed') throw new AppError('SUPPORT_5002');

    const message = await SupportMessage.create({
      ticket_id: ticket.id,
      sender_id: req.user.id,
      sender_name: req.user.name,
      sender_role: req.user.role,
      content: req.body.content,
    });

    if (ticket.status === 'open') {
      await ticket.update({ status: 'in_progress' });
    }

    return success(res, message, req.t('support.messageSent'), 201);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, addMessage };
