// server/app/controllers/category.controller.js
//
// G.2 Categories -- thin, per B.2's rule. Restaurant-scoped only (owner/
// manager manage their own restaurant's categories -- no Super Admin
// cross-restaurant variant needed for menu management, unlike C.7/C.8).

const categoryService = require('../services/category.service');
const { sendSuccess, asyncHandler } = require('../utils');

function actorFrom(req) {
  return { userId: req.tenant.userId, role: req.tenant.role };
}

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.tenant.restaurantId, req.body, actorFrom(req));
  return sendSuccess(res, { data: category, statusCode: 201 });
});

const list = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories(req.tenant.restaurantId);
  return sendSuccess(res, { data: { items: categories, total: categories.length } });
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.tenant.restaurantId, req.params.categoryId, req.body, actorFrom(req));
  return sendSuccess(res, { data: category });
});

const setEnabled = asyncHandler(async (req, res) => {
  const category = await categoryService.setCategoryEnabled(req.tenant.restaurantId, req.params.categoryId, req.body.isEnabled, actorFrom(req));
  return sendSuccess(res, { data: category });
});

const archive = asyncHandler(async (req, res) => {
  const category = await categoryService.archiveCategory(req.tenant.restaurantId, req.params.categoryId, actorFrom(req));
  return sendSuccess(res, { data: category });
});

module.exports = { create, list, update, setEnabled, archive };
