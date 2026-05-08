# 产品品类（ba_spu）页面 CRUD 计划（2026-05-07）

## 1. Summary
- 目标：新增“产品品类”独立页面，数据源切换为 `ba_spu`，实现列表与增删改查（查看/新增/编辑/删除）。
- 导航策略：不替换现有“产品类别（ba_cptype）”，新增菜单入口与视图 `product-spu`。
- 首版范围：基础列表 + CRUD，不做关键字搜索、筛选、分页、自动化测试。
- 表单字段范围：`name`、`brand_id`、`category_id`；`category_name` 由所选分类自动带出并保存，不提供手工编辑。

## 2. Current State Analysis
- `src/pages/ProductCategories.tsx`
  - 当前“产品类别”页面基于 `ba_cptype`，已具备可复用的表格 + `DetailModal` + CRUD 交互模式。
  - 页面字段与数据映射围绕类别树（`parent_id`）和 FAB，不适配 `ba_spu`。
- `src/lib/productRepository.ts`
  - 已包含 `ba_cptype`、`crm_product_series`、`ba_cpinfo` 的读取和保存逻辑。
  - 尚无 `ba_spu` 相关仓储函数，也无 `ba_brand` 下拉数据读取能力。
- `src/types/product.ts`
  - 当前无 `ba_spu` 对应类型定义（仅有 `Product`、`ProductCategory`、`ProductSeries`）。
- `src/components/Sidebar.tsx` 与 `src/App.tsx`
  - 已有 `product-categories`、`product-series` 入口与路由映射；尚无 `product-spu`。
- 数据库结构（`supabase/rebuild/init.sql`、`new_version/supabase_tables.md`）
  - `ba_spu` 字段：`id`、`name`、`brand_id`、`category_id`、`category_name`、`created_at`、`updated_at`。
  - `brand_id` 引用 `ba_brand(id)`，`category_id` 引用 `ba_cptype(id)`，可直接用于下拉选项构建。

## 3. Proposed Changes

### 3.1 `src/types/product.ts`
- 变更内容：
  - 新增 `ProductSpu` 类型（或同语义命名）：
    - `id: string`
    - `name: string`
    - `brandId?: string`
    - `categoryId?: string`
    - `categoryName?: string`
    - `createDate?: string`
  - 新增基础选项类型（可复用已有类型风格），用于品牌/分类下拉项（`id`、`name`）。
- 变更原因：
  - 为 `ba_spu` 页面与仓储提供明确类型边界，避免 `any`。

### 3.2 `src/lib/productRepository.ts`
- 变更内容：
  - 新增 `ba_spu` 映射与 CRUD：
    - `fetchProductSpuFromSupabase()`
    - `saveProductSpuToSupabase(spu)`
    - `deleteProductSpuFromSupabase(id)`
  - 新增基础字典读取：
    - `fetchBrandsFromSupabase()`（来源 `ba_brand`）
    - `fetchProductCategoryOptionsFromSupabase()`（来源 `ba_cptype`，用于 `category_id/category_name`）
  - 保存规则：
    - 新增时不传 `id`，由数据库生成。
    - 编辑时按 `id` 更新。
    - `category_name` 以选中分类名称自动回填后写入。
  - 读取规则：
    - 列表按 `created_at` 倒序（新数据优先）或升序（与现有页面一致）二选一；本次计划采用倒序，提升列表可用性。
    - 将 `created_at` 映射为 `createDate` 供页面展示。
- 变更原因：
  - 当前仓储层无 `ba_spu` 能力，需补齐完整数据读写链路。

### 3.3 `src/pages/ProductSpu.tsx`（新建）
- 变更内容：
  - 新增“产品品类”页面，沿用现有列表页视觉风格与交互习惯：
    - 顶部：标题 + 新增按钮。
    - 列表列：`品类名称`、`品类ID`、`品牌`、`分类`、`创建时间`、`操作`。
    - 操作：`查看`、`编辑`、`删除`。
  - 页面初始化并行拉取：
    - `ba_spu` 列表数据
    - 品牌字典（`ba_brand`）
    - 分类字典（`ba_cptype`）
  - 弹窗（`DetailModal`）字段：
    - `name`（必填）
    - `brandId`（下拉）
    - `categoryId`（下拉）
    - `categoryName` 不展示为可编辑字段，保存前由 `categoryId` 联动填充。
  - 删除流程：
    - 二次确认后调用删除接口，成功后刷新列表。
  - 错误处理：
    - 统一 toast 提示，遵循当前仓储页面处理方式。
- 变更原因：
  - 与已确认范围“新增独立菜单 + 基础 CRUD 列表”完全对齐。

### 3.4 `src/components/Sidebar.tsx`
- 变更内容：
  - 在“资源中心”新增菜单项：
    - `id: 'product-spu'`
    - `label: '产品品类'`
    - 图标复用现有类目图标（如 `FolderKanban`）。
- 变更原因：
  - 你已确认需要独立入口，不替换现有产品类别页。

### 3.5 `src/App.tsx`
- 变更内容：
  - 新增页面懒加载：`ProductSpu`。
  - 在 `getViewLabel` 增加 `'product-spu': '产品品类'`。
  - 在 `renderView` 增加 `case 'product-spu': return <ProductSpu />;`。
- 变更原因：
  - 使新页面可被导航系统识别、打开并展示正确页签文案。

## 4. Assumptions & Decisions
- 已确认决策：
  - 新增独立菜单，不替换现有 `product-categories`。
  - 页面与菜单文案统一“产品品类”。
  - 视图 ID 使用 `product-spu`。
  - 首版仅做基础列表 + CRUD，不做搜索/筛选。
  - 验收以手工功能链路为主，不新增自动化测试。
- 实施假设：
  - `ba_brand`、`ba_cptype` 表具备可读数据，作为下拉数据源。
  - `ba_spu.category_name` 允许由前端按分类自动回填并持久化。
  - 现有 `DetailModal` 能承载新增页面字段配置与保存回调。
- 不在本次范围：
  - 变更 `ba_spu` 表结构。
  - 引入后端新服务层或额外 API 网关。
  - 调整 `products`、`product-categories`、`product-series` 既有业务逻辑。
  - 新增 SQL 迁移（本次仅使用现有表结构）。

## 5. Verification Steps
- 手工功能验收：
  - 侧边栏“资源中心”出现“产品品类”，点击可打开新页签。
  - 列表正确展示 `ba_spu` 数据，列头包含：品类名称、品类ID、品牌、分类、创建时间、操作。
  - 新增：填写 `name + 品牌 + 分类` 后保存成功，列表出现新记录，`category_name` 正确带出。
  - 查看：详情可只读查看字段值。
  - 编辑：修改后保存成功，列表刷新后显示新值。
  - 删除：确认后删除成功并从列表移除。
  - 创建时间：有值时按 `YYYY-MM-DD HH:mm` 展示，无值显示 `-`。
- 稳定性检查：
  - 原有 `product-categories`、`product-series` 页面入口仍可正常访问。
  - 页面切换与多页签打开行为保持正常。

