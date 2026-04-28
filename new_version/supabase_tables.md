# Supabase 表结构对照网格

## ENUM 类型定义

### crm\_inquiry\_status\_enum (询盘状态枚举)

| 值    | 描述       |
| ---- | -------- |
| 待处理  | 询盘待处理    |
| 已转线索 | 询盘已转化为线索 |
| 关闭   | 询盘已关闭    |

### crm\_inquiry\_source\_channel\_enum (询盘来源渠道枚举)

| 值    | 描述     |
| ---- | ------ |
| 万连   | 万连平台   |
| 电子谷  | 电子谷平台  |
| 1688 | 1688平台 |
| 爱采购  | 百度爱采购  |
| 胜蓝   | 胜蓝平台   |
| 新电子谷 | 新电子谷平台 |
| 其他   | 其他渠道   |
| 淘宝   | 淘宝平台   |
| 官网   | 官网渠道   |
| 展会   | 展会收集   |

### crm\_lead\_status\_enum (线索状态枚举)

| 值   | 描述     |
| --- | ------ |
| 未跟进 | 未跟进    |
| 跟进中 | 跟进中    |
| 关闭  | 已关闭    |
| 转商机 | 已转化为商机 |

### crm\_lead\_customer\_action\_enum (线索客户动作枚举)

| 值    | 描述    |
| ---- | ----- |
| 寻替代料 | 寻找替代料 |
| 寻替代品 | 寻找替代品 |
| 找货寻料 | 找货寻料  |
| 指定料号 | 指定料号  |
| 指定物料 | 指定物料  |

### crm\_lead\_source\_type\_enum (线索来源类型枚举)

| 值    | 描述   |
| ---- | ---- |
| 企业微信 | 企业微信 |
| 注册   | 注册来源 |
| 在线   | 在线来源 |
| 微信   | 微信   |
| 邮件   | 邮件   |
| 电话   | 电话   |
| 其他   | 其他来源 |

### crm\_lead\_source\_status\_enum (线索来源状态枚举)

| 值    | 描述   |
| ---- | ---- |
| 客服   | 客服来源 |
| 自己开发 | 自己开发 |

### crm\_lead\_product\_industry\_enum (线索产品行业枚举)

| 值     | 描述    |
| ----- | ----- |
| 基础接插件 | 基础接插件 |
| 新能源   | 新能源   |
| 线束    | 线束    |
| 定制    | 定制    |
| 胜蓝    | 胜蓝    |
| 胜蓝电气  | 胜蓝电气  |
| 工业    | 工业    |

### crm\_opportunity\_status\_enum (商机状态枚举)

| 值   | 描述     |
| --- | ------ |
| 未跟进 | 未跟进    |
| 跟进中 | 跟进中    |
| 关闭  | 已关闭    |
| 转项目 | 已转化为项目 |

### crm\_project\_status\_enum (项目状态枚举)

| 值      | 描述     |
| ------ | ------ |
| 跟进中    | 跟进中    |
| 样品/小批量 | 样品或小批量 |
| 已合作    | 已合作    |
| 关闭     | 已关闭    |
| 暂停     | 已暂停    |

### crm\_project\_stage\_enum (项目阶段枚举)

| 值    | 描述   |
| ---- | ---- |
| 需求阶段 | 需求阶段 |
| 设计阶段 | 设计阶段 |
| 报价阶段 | 报价阶段 |
| 样品制作 | 样品制作 |
| 样品承认 | 样品承认 |
| 试产阶段 | 试产阶段 |
| 重复试产 | 重复试产 |
| 量产阶段 | 量产阶段 |

### crm\_product\_line\_enum (产品线枚举)

| 值     | 描述    |
| ----- | ----- |
| 接插件   | 接插件   |
| 线束    | 线束    |
| 工业连接器 | 工业连接器 |
| IO连接器 | IO连接器 |
| 电子电气  | 电子电气  |
| 其他    | 其他    |

## 1. 基础表结构

### ba\_employeeinfo (员工信息表)

| 字段名         | 数据类型        | 约束          | 默认值    | 描述   |
| ----------- | ----------- | ----------- | ------ | ---- |
| id          | text        | primary key | <br /> | 员工ID |
| no          | text        | <br />      | <br /> | 员工编号 |
| name        | text        | not null    | <br /> | 员工姓名 |
| username    | text        | not null    | <br /> | 用户名  |
| email       | text        | <br />      | <br /> | 邮箱   |
| role        | text        | <br />      | <br /> | 角色   |
| department  | text        | <br />      | <br /> | 部门   |
| is\_active  | boolean     | <br />      | true   | 是否激活 |
| created\_at | timestamptz | not null    | now()  | 创建时间 |
| updated\_at | timestamptz | not null    | now()  | 更新时间 |

### ba\_cptype (产品分类表)

| 字段名             | 数据类型        | 约束                                   | 默认值    | 描述           |
| --------------- | ----------- | ------------------------------------ | ------ | ------------ |
| id              | int         | not null auto\_increment primary key | <br /> | 分类ID         |
| parent\_id      | int         | references ba\_cptype(id)            | <br /> | 父分类ID        |
| name            | text        | not null                             | <br /> | 分类名称         |
| image           | text        | <br />                               | <br /> | 分类图片         |
| fab\_features   | text        | not null                             | ''     | FAB特性        |
| fab\_advantages | text        | not null                             | ''     | FAB优势        |
| fab\_benefits   | text        | not null                             | ''     | FAB益处        |
| status          | int         | not null                             | 1      | 状态（1启用/0不启用） |
| created\_at     | timestamptz | not null                             | now()  | 创建时间         |
| updated\_at     | timestamptz | not null                             | now()  | 更新时间         |

### crm\_product\_series (产品系列表)

| 字段名             | 数据类型        | 约束                                           | 默认值    | 描述    |
| --------------- | ----------- | -------------------------------------------- | ------ | ----- |
| id              | text        | primary key                                  | <br /> | 系列ID  |
| name            | text        | not null                                     | <br /> | 系列名称  |
| category\_id    | int         | references ba\_cptype(id) on delete set null | <br /> | 分类ID  |
| description     | text        | not null                                     | ''     | 描述    |
| fab\_features   | text        | not null                                     | ''     | FAB特性 |
| fab\_advantages | text        | not null                                     | ''     | FAB优势 |
| fab\_benefits   | text        | not null                                     | ''     | FAB益处 |
| created\_at     | timestamptz | not null                                     | now()  | 创建时间  |
| updated\_at     | timestamptz | not null                                     | now()  | 更新时间  |

### ba\_cpinfo (产品信息表)

| 字段名                          | 数据类型          | 约束                                   | 默认值    | 描述                 |
| ---------------------------- | ------------- | ------------------------------------ | ------ | ------------------ |
| id                           | int           | not null auto\_increment primary key | <br /> | 产品ID               |
| category\_id                 | int           | references ba\_cptype(id)            | <br /> | 分类ID               |
| category\_name               | text          | <br />                               | <br /> | 分类名称               |
| material\_no                 | text          | not null                             | <br /> | 物料编号               |
| material\_name               | text          | not null                             | <br /> | 物料名称               |
| specification                | text          | <br />                               | <br /> | 规格                 |
| unit                         | text          | not null                             | <br /> | 单位                 |
| price                        | numeric(18,2) | not null                             | 0      | 价格                 |
| min\_price                   | numeric(18,2) | <br />                               | <br /> | 最低价格               |
| status                       | int           | not null                             | 1      | 状态（0下架 1正常 10违规）   |
| brand\_id                    | int           | references ba\_brand(id)             | <br /> | 品牌ID               |
| brand\_name                  | text          | <br />                               | <br /> | 品牌名称               |
| min\_pack\_qty               | numeric(18,2) | <br />                               | 0      | 最小包装量              |
| min\_order\_qty              | numeric(18,2) | <br />                               | 0      | 最小起订量              |
| outsource\_supplier\_drawing | text          | <br />                               | <br /> | 外发供应商图纸            |
| drawing\_3d                  | text          | <br />                               | <br /> | 3D图纸               |
| supplier                     | text          | <br />                               | <br /> | 供应商                |
| supplier\_no                 | text          | <br />                               | <br /> | 供应商号               |
| supplier\_material\_no       | text          | <br />                               | <br /> | 供应商物料号             |
| supplier\_material\_name     | text          | <br />                               | <br /> | 供应商物料名称            |
| product\_line\_level1\_id    | int           | references ba\_product\_line(id)     | <br /> | 产品线一级id            |
| product\_line\_level2\_id    | int           | references ba\_product\_line(id)     | <br /> | 产品线二级id            |
| product\_belonging           | int           | <br />                               | -1     | 产品归属(0/1/2/3/4/-1) |
| group\_id                    | int           | references ba\_group(id)             | <br /> | 归属小组ID             |
| group\_name                  | text          | <br />                               | <br /> | 归属小组名称             |
| outsource\_customer\_drawing | text          | <br />                               | <br /> | 外发客户图纸             |
| customer\_original\_drawing  | text          | <br />                               | <br /> | 客户原图纸              |
| change\_drawing\_detail      | text          | <br />                               | <br /> | 变更图纸详情             |
| specification\_doc           | text          | <br />                               | <br /> | 规格书                |
| inspection\_standard         | text          | <br />                               | <br /> | 检验基准书              |
| spu\_id                      | int           | references ba\_spu(id)               | <br /> | 品类ID               |
| spu\_name                    | text          | <br />                               | <br /> | 品类名称               |
| platform\_material\_no       | text          | <br />                               | <br /> | 平台料号               |
| material\_lead\_time         | int           | <br />                               | <br /> | 物料交期(天)            |
| packaging\_method            | text          | <br />                               | <br /> | 包装方式               |
| packaging\_spec              | text          | <br />                               | <br /> | 包装规格               |
| created\_at                  | timestamptz   | not null                             | now()  | 创建时间               |
| updated\_at                  | timestamptz   | not null                             | now()  | 更新时间               |

### ba\_spu (产品品类表)

| 字段名            | 数据类型        | 约束                                   | 默认值    | 描述   |
| -------------- | ----------- | ------------------------------------ | ------ | ---- |
| id             | int         | not null auto\_increment primary key | <br /> | 主键   |
| name           | text        | not null                             | <br /> | 品类名称 |
| brand\_id      | int         | references ba\_brand(id)             | <br /> | 品牌ID |
| category\_id   | int         | references ba\_cptype(id)            | <br /> | 分类ID |
| category\_name | text        | <br />                               | <br /> | 分类名称 |
| created\_at    | timestamptz | not null                             | now()  | 创建时间 |
| updated\_at    | timestamptz | not null                             | now()  | 更新时间 |

### ba\_product\_property\_relation (产品本体属性关系表)

| 字段名                 | 数据类型        | 约束                                            | 默认值    | 描述                 |
| ------------------- | ----------- | --------------------------------------------- | ------ | ------------------ |
| id                  | int         | not null unsigned auto\_increment primary key | <br /> | 主键                 |
| material\_id        | text        | not null                                      | <br /> | 物料ID               |
| product\_id         | int         | references ba\_cpinfo(id)                     | <br /> | 产品ID               |
| spu\_status         | int         | not null                                      | 1      | 品类状态（0下架 1正常 10违规） |
| product\_status     | int         | not null                                      | 1      | 商品状态（0下架 1正常 10违规） |
| product\_name       | text        | not null                                      | <br /> | 产品名称               |
| property\_id        | int         | <br />                                        | <br /> | 属性ID               |
| property\_name      | text        | <br />                                        | <br /> | 属性名称               |
| property\_value     | text        | <br />                                        | <br /> | 属性值                |
| property\_value\_id | int         | <br />                                        | <br /> | 属性值ID              |
| category\_id        | int         | references ba\_cptype(id)                     | <br /> | 分类ID               |
| category\_name      | text        | <br />                                        | <br /> | 分类名称               |
| created\_at         | timestamptz | not null                                      | now()  | 创建时间               |
| updated\_at         | timestamptz | not null                                      | now()  | 更新时间               |

### ba\_brand (品牌表)

| 字段名         | 数据类型        | 约束                                   | 默认值    | 描述          |
| ----------- | ----------- | ------------------------------------ | ------ | ----------- |
| id          | int         | not null auto\_increment primary key | <br /> | 主键          |
| name        | text        | not null                             | <br /> | 品牌名称        |
| status      | int         | not null                             | 1      | 状态（1启用，0禁用） |
| created\_at | timestamptz | not null                             | now()  | 创建时间        |
| updated\_at | timestamptz | not null                             | now()  | 更新时间        |

### ba\_group (归属小组表)

| 字段名         | 数据类型        | 约束                                   | 默认值    | 描述   |
| ----------- | ----------- | ------------------------------------ | ------ | ---- |
| id          | int         | not null auto\_increment primary key | <br /> | 主键   |
| name        | text        | not null                             | <br /> | 小组名称 |
| manager     | text        | <br />                               | <br /> | 负责人  |
| created\_at | timestamptz | not null                             | now()  | 创建时间 |
| updated\_at | timestamptz | not null                             | now()  | 更新时间 |

### ba\_product\_line (产品线表)

| 字段名         | 数据类型        | 约束                                   | 默认值    | 描述     |
| ----------- | ----------- | ------------------------------------ | ------ | ------ |
| id          | int         | not null auto\_increment primary key | <br /> | 主键     |
| parent\_id  | int         | references ba\_product\_line(id)     | <br /> | 父级ID   |
| name        | text        | not null                             | <br /> | 产品线名称  |
| manager     | text        | <br />                               | <br /> | 产品线负责人 |
| created\_at | timestamptz | not null                             | now()  | 创建时间   |
| updated\_at | timestamptz | not null                             | now()  | 更新时间   |

### ba\_manucustinfo (客户信息表)

| 字段名                              | 数据类型        | 约束                                   | 默认值    | 描述                                                                |
| -------------------------------- | ----------- | ------------------------------------ | ------ | ----------------------------------------------------------------- |
| id                               | int         | not null auto\_increment primary key | <br /> | 客户ID                                                              |
| customer\_number                 | text        | not null default ''                  | <br /> | 客户编号（系统自动生成，格式：CUS-YYYYMMDD-XXX）                                  |
| name                             | text        | not null                             | <br /> | 客户名称                                                              |
| level                            | text        | not null                             | '普通客户' | 客户等级                                                              |
| status                           | int         | not null                             | 1      | 状态（1正常, 0冻结）                                                      |
| industry                         | text        | <br />                               | <br /> | 行业                                                                |
| source                           | int         | <br />                               | <br /> | 来源（1：展会收集 2:朋友介绍 3:网络推广 4:客户转介绍 5:个人观察 6:网上搜索 7:电商平台）             |
| region                           | int         | <br />                               | <br /> | 区域（1：东北地区 2：华北地区 3：西北地区 4：华东地区 5：华南地区 6：西南地区 7：港澳台地区 8：国外 9：华中地区） |
| sales\_rep                       | text        | <br />                               | <br /> | 销售代表                                                              |
| payment\_term                    | int         | <br />                               | <br /> | 账期（3:30天、6:60天、9:90天、12:12天）                                      |
| has\_payment\_term               | int         | <br />                               | 0      | 是否有账期（0:未有账期、1:有账期）                                               |
| customer\_type                   | int         | <br />                               | <br /> | 客户类型（0:普通企业 1:认证企业 2:个人）                                          |
| merchandiser                     | text        | <br />                               | <br /> | 跟单员                                                               |
| merchandiser\_id                 | text        | <br />                               | <br /> | 跟单员ID                                                             |
| is\_public\_pool                 | boolean     | <br />                               | false  | 是否落入公海                                                            |
| month\_settlement\_apply\_status | int         | <br />                               | 0      | 月结申请状态（0:未申请、1:申请中、2:已通过、3:已拒绝）                                   |
| business\_manager                | text        | <br />                               | <br /> | 业务经理                                                              |
| currency                         | text        | <br />                               | <br /> | 币别                                                                |
| currency\_id                     | int         | <br />                               | <br /> | 币别ID (1:人民币, 2:美元)                                                |
| customer\_category               | int         | <br />                               | 0      | 客户类别（0:空，1:直销商，2:经销商）                                             |
| group\_name                      | text        | <br />                               | <br /> | 集团                                                                |
| is\_listed\_company              | boolean     | <br />                               | false  | 是否上市公司                                                            |
| short\_name                      | text        | <br />                               | <br /> | 客户简称                                                              |
| english\_name                    | text        | <br />                               | <br /> | 英文名称                                                              |
| insured\_count                   | int         | <br />                               | <br /> | 参保人数                                                              |
| paid\_in\_capital                | text        | <br />                               | <br /> | 实缴资金                                                              |
| last\_visit\_date                | date        | <br />                               | <br /> | 最后访问日期                                                            |
| last\_contact\_time              | timestamptz | <br />                               | <br /> | 最后联系时间                                                            |
| last\_contact\_action            | text        | <br />                               | <br /> | 最后联系动作                                                            |
| legal\_person                    | text        | <br />                               | <br /> | 法人                                                                |
| registered\_capital              | text        | <br />                               | <br /> | 注册资金                                                              |
| industry\_level\_1               | text        | <br />                               | <br /> | 一级行业                                                              |
| industry\_level\_2               | text        | <br />                               | <br /> | 二级行业                                                              |
| industry\_level\_3               | text        | <br />                               | <br /> | 三级行业                                                              |
| employee\_count                  | text        | <br />                               | <br /> | 员工数量                                                              |
| establishment\_date              | date        | <br />                               | <br /> | 成立日期                                                              |
| unified\_social\_credit\_code    | text        | <br />                               | <br /> | 统一社会信用代码                                                          |
| company\_address                 | text        | <br />                               | <br /> | 公司地址                                                              |
| company\_type                    | text        | <br />                               | <br /> | 企业类型                                                              |
| fax\_number                      | text        | <br />                               | <br /> | 传真号码                                                              |
| month\_settlement\_attachment    | text        | <br />                               | <br /> | 月结附件                                                              |
| month\_settlement\_agreement     | text        | <br />                               | <br /> | 月结协议                                                              |
| business\_scope                  | text        | <br />                               | <br /> | 经营范围                                                              |
| website                          | text        | <br />                               | <br /> | 网站                                                                |
| created\_at                      | timestamptz | not null                             | now()  | 创建时间                                                              |
| updated\_at                      | timestamptz | not null                             | now()  | 更新时间                                                              |

### ba\_customer\_user (用户表)

| 字段名           | 数据类型        | 约束                                            | 默认值    | 描述                                  |
| ------------- | ----------- | --------------------------------------------- | ------ | ----------------------------------- |
| id            | int         | not null unsigned auto\_increment primary key | <br /> | 主键                                  |
| customer\_id  | int         | not null references ba\_manucustinfo(id)      | <br /> | 客户ID                                |
| member\_name  | text        | not null                                      | <br /> | 会员名称                                |
| contact\_name | text        | <br />                                        | <br /> | 联系人                                 |
| phone         | text        | <br />                                        | <br /> | 手机号                                 |
| email         | text        | <br />                                        | <br /> | 邮箱                                  |
| is\_primary   | int         | not null                                      | 0      | 是否首联系人（0否，1是）                       |
| status        | int         | not null                                      | 1      | 账户状态（1正常，0冻结）                       |
| source        | int         | not null                                      | <br /> | 账户来源（1线上，2后台，3公众号注册，4短信推广注册，5微信小程序） |
| created\_at   | timestamptz | not null                                      | now()  | 创建时间                                |
| updated\_at   | timestamptz | not null                                      | now()  | 更新时间                                |

## 2. 客户管理

### crm\_customer\_contact (客户联系人表)

| 字段名                     | 数据类型        | 约束                                                         | 默认值    | 描述      |
| ----------------------- | ----------- | ---------------------------------------------------------- | ------ | ------- |
| id                      | text        | primary key                                                | <br /> | 联系人ID   |
| customer\_id            | integer     | not null references ba\_manucustinfo(id) on delete cascade | <br /> | 客户ID    |
| name                    | text        | not null                                                   | <br /> | 联系人姓名   |
| position                | text        | <br />                                                     | <br /> | 职位      |
| department              | text        | <br />                                                     | <br /> | 部门      |
| phone                   | text        | <br />                                                     | <br /> | 电话      |
| email                   | text        | <br />                                                     | <br /> | 邮箱      |
| is\_primary             | boolean     | <br />                                                     | false  | 是否主要联系人 |
| buying\_role            | text        | <br />                                                     | <br /> | 采购角色    |
| buying\_mode            | text        | <br />                                                     | <br /> | 采购模式    |
| appellation             | text        | <br />                                                     | <br /> | 称呼      |
| wechat\_id              | text        | <br />                                                     | <br /> | 微信号     |
| manager\_contact\_id    | text        | references crm\_customer\_contact(id) on delete set null   | <br /> | 经理联系人ID |
| faction                 | text        | not null                                                   | ''     | 派系      |
| attitude\_to\_us        | text        | not null                                                   | '中性评价' | 对我们的态度  |
| attitude\_score         | int         | not null                                                   | 0      | 态度评分    |
| role\_tag               | text        | not null                                                   | 'I'    | 角色标签    |
| influence\_level        | int         | not null                                                   | 3      | 影响力等级   |
| relation\_level         | int         | not null                                                   | 2      | 关系等级    |
| graduation\_school      | text        | not null                                                   | ''     | 毕业学校    |
| hometown                | text        | not null                                                   | ''     | 家乡      |
| hobbies                 | text\[]     | not null                                                   | '{}'   | 爱好      |
| family\_situation       | text        | not null                                                   | ''     | 家庭情况    |
| personality             | text        | not null                                                   | ''     | 性格      |
| preferences             | text        | not null                                                   | ''     | 偏好      |
| key\_concerns           | text        | not null                                                   | ''     | 关键关注点   |
| follow\_strategy        | text        | not null                                                   | ''     | 跟进策略    |
| video\_channel\_profile | text        | not null                                                   | ''     | 视频号资料   |
| douyin\_profile         | text        | not null                                                   | ''     | 抖音资料    |
| xiaohongshu\_profile    | text        | not null                                                   | ''     | 小红书资料   |
| social\_media\_behavior | text        | not null                                                   | ''     | 社交媒体行为  |
| gender                  | text        | <br />                                                     | <br /> | 性别      |
| office\_phone           | text        | <br />                                                     | <br /> | 办公电话    |
| fax\_number             | text        | <br />                                                     | <br /> | 传真号码    |
| is\_employed            | boolean     | <br />                                                     | <br /> | 是否在职    |
| marital\_status         | text        | <br />                                                     | <br /> | 婚姻状况    |
| birth\_date             | date        | <br />                                                     | <br /> | 出生日期    |
| highest\_education      | text        | <br />                                                     | <br /> | 最高学历    |
| native\_place           | text        | <br />                                                     | <br /> | 籍贯      |
| religion                | text        | <br />                                                     | <br /> | 宗教信仰    |
| entry\_date             | date        | <br />                                                     | <br /> | 入职日期    |
| is\_key\_person         | boolean     | <br />                                                     | <br /> | 是否关键人物  |
| created\_at             | timestamptz | not null                                                   | now()  | 创建时间    |
| updated\_at             | timestamptz | not null                                                   | now()  | 更新时间    |

### crm\_customer\_persona (客户画像表)

| 字段名                      | 数据类型        | 约束                                                         | 默认值    | 描述     |
| ------------------------ | ----------- | ---------------------------------------------------------- | ------ | ------ |
| id                       | text        | primary key                                                | <br /> | 画像ID   |
| customer\_id             | text        | not null references ba\_manucustinfo(id) on delete cascade | <br /> | 客户ID   |
| scale                    | text        | <br />                                                     | <br /> | 规模     |
| main\_products           | text        | <br />                                                     | <br /> | 主要产品   |
| org\_structure           | text        | <br />                                                     | <br /> | 组织结构   |
| buying\_mode             | text        | <br />                                                     | <br /> | 采购模式   |
| pain\_points             | text        | <br />                                                     | <br /> | 痛点     |
| competitive\_supplier    | text        | <br />                                                     | <br /> | 竞争供应商  |
| competitive\_preference  | text        | <br />                                                     | <br /> | 竞争偏好   |
| unique\_needs            | text        | <br />                                                     | <br /> | 独特需求   |
| rd\_requirements         | text        | <br />                                                     | <br /> | 研发需求   |
| sample\_requirements     | text        | <br />                                                     | <br /> | 样品需求   |
| production\_requirements | text        | <br />                                                     | <br /> | 生产需求   |
| last\_updated            | date        | <br />                                                     | <br /> | 最后更新日期 |
| created\_at              | timestamptz | not null                                                   | now()  | 创建时间   |
| updated\_at              | timestamptz | not null                                                   | now()  | 更新时间   |

## 3. 销售流程

### crm\_inquiry (询盘表)

| 字段名               | 数据类型                                | 约束                              | 默认值           | 描述     |
| ----------------- | ----------------------------------- | ------------------------------- | ------------- | ------ |
| id                | text                                | primary key                     | <br />        | 询盘ID   |
| customer\_id      | integer                             | references ba\_manucustinfo(id) | <br />        | 客户ID   |
| company\_name     | text                                | not null                        | <br />        | 公司名称   |
| customer\_name    | text                                | <br />                          | <br />        | 客户姓名   |
| contact           | text                                | <br />                          | <br />        | 联系方式   |
| source\_channel   | crm\_inquiry\_source\_channel\_enum | <br />                          | <br />        | 来源渠道   |
| category          | text                                | <br />                          | <br />        | 分类     |
| product\_series   | text                                | not null                        | ''            | 产品系列   |
| province          | text                                | <br />                          | <br />        | 省份     |
| situation         | text                                | <br />                          | <br />        | 情况     |
| status            | crm\_inquiry\_status\_enum          | not null                        | '待处理'         | 状态     |
| classification    | text                                | <br />                          | <br />        | 分类     |
| unconvert\_reason | text                                | <br />                          | <br />        | 未转化原因  |
| customer\_inquiry | text                                | <br />                          | <br />        | 客户询盘内容 |
| unconverted\_time | date                                | <br />                          | <br />        | 未转化时间  |
| notes             | text                                | <br />                          | <br />        | 备注     |
| associated\_lead  | text                                | <br />                          | <br />        | 关联线索   |
| attachments       | jsonb                               | <br />                          | <br />        | 附件     |
| create\_date      | date                                | not null                        | current\_date | 创建日期   |
| update\_date      | date                                | <br />                          | <br />        | 更新日期   |
| creator\_id       | text                                | <br />                          | <br />        | 创建者ID  |
| creator\_name     | text                                | <br />                          | <br />        | 创建者姓名  |
| updater           | text                                | <br />                          | <br />        | 更新者    |
| created\_at       | timestamptz                         | not null                        | now()         | 创建时间   |
| updated\_at       | timestamptz                         | not null                        | now()         | 更新时间   |

### crm\_lead (线索表)

| 字段名                   | 数据类型                                | 约束                                    | 默认值           | 描述    |
| --------------------- | ----------------------------------- | ------------------------------------- | ------------- | ----- |
| id                    | text                                | primary key                           | <br />        | 线索ID  |
| customer\_id          | text                                | references ba\_manucustinfo(id)       | <br />        | 客户ID  |
| customer\_name        | text                                | not null                              | <br />        | 客户名称  |
| name                  | text                                | <br />                                | <br />        | 联系人姓名 |
| phone                 | text                                | <br />                                | <br />        | 电话    |
| customer\_action      | crm\_lead\_customer\_action\_enum   | <br />                                | <br />        | 客户动作  |
| industry              | text                                | <br />                                | <br />        | 行业    |
| status                | crm\_lead\_status\_enum             | not null                              | '未跟进'         | 状态    |
| classification        | text                                | <br />                                | <br />        | 分类    |
| assignee              | text                                | <br />                                | <br />        | 负责人   |
| entry\_time           | text                                | <br />                                | <br />        | 录入时间  |
| source\_channel       | crm\_inquiry\_source\_channel\_enum | <br />                                | <br />        | 来源渠道  |
| source\_type          | crm\_lead\_source\_type\_enum       | <br />                                | <br />        | 来源类型  |
| product\_category     | text                                | <br />                                | <br />        | 产品分类  |
| product\_series       | text                                | <br />                                | <br />        | 产品系列  |
| source\_status        | crm\_lead\_source\_status\_enum     | <br />                                | <br />        | 来源状态  |
| inquiry\_id           | text                                | references crm\_inquiry(id)           | <br />        | 询盘ID  |
| contact\_id           | text                                | references crm\_customer\_contact(id) | <br />        | 联系人ID |
| intent\_score         | numeric(10,2)                       | <br />                                | <br />        | 意向评分  |
| buying\_mode          | text                                | <br />                                | <br />        | 采购模式  |
| buyer\_role           | text                                | <br />                                | <br />        | 采购角色  |
| product\_industry     | crm\_lead\_product\_industry\_enum  | <br />                                | <br />        | 产品行业  |
| close\_time           | date                                | <br />                                | <br />        | 关闭时间  |
| close\_reason         | text                                | <br />                                | <br />        | 关闭原因  |
| customer\_opportunity | text                                | <br />                                | <br />        | 客户机会  |
| attachments           | jsonb                               | <br />                                | <br />        | 附件    |
| create\_date          | date                                | not null                              | current\_date | 创建日期  |
| creator\_id           | text                                | <br />                                | <br />        | 创建者ID |
| creator\_name         | text                                | <br />                                | <br />        | 创建者姓名 |
| created\_at           | timestamptz                         | not null                              | now()         | 创建时间  |
| updated\_at           | timestamptz                         | not null                              | now()         | 更新时间  |

### crm\_opportunity (商机表)

| 字段名                               | 数据类型                               | 约束                              | 默认值           | 描述     |
| --------------------------------- | ---------------------------------- | ------------------------------- | ------------- | ------ |
| id                                | text                               | primary key                     | <br />        | 商机ID   |
| customer\_id                      | integer                            | references ba\_manucustinfo(id) | <br />        | 客户ID   |
| customer\_name                    | text                               | not null                        | <br />        | 客户名称   |
| opp\_date                         | date                               | not null                        | current\_date | 商机日期   |
| status                            | crm\_opportunity\_status\_enum     | not null                        | '未跟进'         | 状态     |
| opp\_summary                      | text                               | <br />                          | <br />        | 商机摘要   |
| product\_line                     | crm\_product\_line\_enum           | <br />                          | <br />        | 产品线    |
| sales\_rep                        | text                               | <br />                          | <br />        | 销售代表   |
| project\_manager                  | text                               | <br />                          | <br />        | 项目经理   |
| product\_owner                    | text                               | <br />                          | <br />        | 产品负责人  |
| opp\_level                        | text                               | <br />                          | <br />        | 商机等级   |
| intent\_amount                    | numeric(18,2)                      | <br />                          | <br />        | 意向金额   |
| associated\_project               | text                               | <br />                          | <br />        | 关联项目   |
| end\_customer                     | text                               | <br />                          | <br />        | 终端客户   |
| end\_project                      | text                               | <br />                          | <br />        | 终端项目   |
| sales\_type                       | text                               | <br />                          | <br />        | 销售类型   |
| product\_industry                 | crm\_lead\_product\_industry\_enum | <br />                          | <br />        | 产品行业   |
| completeness                      | numeric(5,2)                       | <br />                          | <br />        | 完整度    |
| contact\_person                   | text                               | <br />                          | <br />        | 联系人    |
| lead\_id                          | text                               | references crm\_lead(id)        | <br />        | 线索ID   |
| inquiry\_id                       | text                               | references crm\_inquiry(id)     | <br />        | 询盘ID   |
| application\_scenario             | text                               | <br />                          | <br />        | 应用场景   |
| estimated\_usage                  | text                               | <br />                          | <br />        | 预计用量   |
| estimated\_mass\_production\_date | date                               | <br />                          | <br />        | 预计量产日期 |
| close\_time                       | date                               | <br />                          | <br />        | 关闭时间   |
| close\_reason                     | text                               | <br />                          | <br />        | 关闭原因   |
| attachments                       | jsonb                              | <br />                          | <br />        | 附件     |
| created\_at                       | timestamptz                        | not null                        | now()         | 创建时间   |
| updated\_at                       | timestamptz                        | not null                        | now()         | 更新时间   |

### crm\_project (项目表)

| 字段名                               | 数据类型                               | 约束                              | 默认值    | 描述     |
| --------------------------------- | ---------------------------------- | ------------------------------- | ------ | ------ |
| id                                | text                               | primary key                     | <br /> | 项目ID   |
| customer\_id                      | integer                            | references ba\_manucustinfo(id) | <br /> | 客户ID   |
| customer\_name                    | text                               | not null                        | <br /> | 客户名称   |
| project\_name                     | text                               | not null                        | <br /> | 项目名称   |
| status                            | crm\_project\_status\_enum         | not null                        | '跟进中'  | 状态     |
| stage                             | crm\_project\_stage\_enum          | not null                        | '需求阶段' | 阶段     |
| manager                           | text                               | <br />                          | <br /> | 经理     |
| amount                            | numeric(18,2)                      | <br />                          | <br /> | 金额     |
| project\_type                     | text                               | <br />                          | <br /> | 项目类型   |
| project\_level                    | text                               | <br />                          | <br /> | 项目等级   |
| wechat\_group                     | text                               | <br />                          | <br /> | 微信群    |
| team                              | jsonb                              | <br />                          | <br /> | 团队     |
| notes                             | jsonb                              | <br />                          | <br /> | 备注     |
| requirements                      | jsonb                              | <br />                          | <br /> | 需求     |
| progress                          | jsonb                              | <br />                          | <br /> | 进度     |
| tasks                             | jsonb                              | <br />                          | <br /> | 任务     |
| samples                           | jsonb                              | <br />                          | <br /> | 样品     |
| purchasing\_quotes                | jsonb                              | <br />                          | <br /> | 采购报价   |
| quotations                        | jsonb                              | <br />                          | <br /> | 报价单    |
| requirement\_changes              | jsonb                              | <br />                          | <br /> | 需求变更   |
| communication\_details            | jsonb                              | <br />                          | <br /> | 沟通详情   |
| is\_key\_project                  | boolean                            | <br />                          | false  | 是否关键项目 |
| ai\_analysis                      | jsonb                              | <br />                          | <br /> | AI分析   |
| creator\_id                       | text                               | <br />                          | <br /> | 创建者ID  |
| creator\_no                       | text                               | <br />                          | <br /> | 创建者编号  |
| creator\_name                     | text                               | <br />                          | <br /> | 创建者姓名  |
| create\_date                      | date                               | <br />                          | <br /> | 创建日期   |
| end\_customer                     | text                               | <br />                          | <br /> | 终端客户   |
| opp\_summary                      | text                               | <br />                          | <br /> | 商机摘要   |
| application\_scenario             | text                               | <br />                          | <br /> | 应用场景   |
| intent\_amount                    | numeric(18,2)                      | <br />                          | <br /> | 意向金额   |
| end\_project                      | text                               | <br />                          | <br /> | 终端项目   |
| product\_industry                 | crm\_lead\_product\_industry\_enum | <br />                          | <br /> | 产品行业   |
| estimated\_usage                  | text                               | <br />                          | <br /> | 预计用量   |
| estimated\_mass\_production\_date | date                               | <br />                          | <br /> | 预计量产日期 |
| customer\_action                  | crm\_lead\_customer\_action\_enum  | <br />                          | <br /> | 客户动作   |
| sales\_rep                        | text                               | <br />                          | <br /> | 销售代表   |
| product\_owner                    | text                               | <br />                          | <br /> | 产品负责人  |
| quality\_owner                    | text                               | <br />                          | <br /> | 质量负责人  |
| purchaser                         | text                               | <br />                          | <br /> | 采购     |
| fae                               | text                               | <br />                          | <br /> | 技术支持   |
| lead\_id                          | text                               | <br />                          | <br /> | 线索ID   |
| opportunity\_id                   | text                               | <br />                          | <br /> | 商机ID   |
| inquiry\_id                       | text                               | <br />                          | <br /> | 询盘ID   |
| close\_time                       | date                               | <br />                          | <br /> | 关闭时间   |
| close\_reason                     | text                               | <br />                          | <br /> | 关闭原因   |
| product\_line                     | crm\_product\_line\_enum           | <br />                          | <br /> | 产品线    |
| start\_date                       | date                               | <br />                          | <br /> | 开始日期   |
| end\_date                         | date                               | <br />                          | <br /> | 结束日期   |
| attachments                       | jsonb                              | <br />                          | <br /> | 附件     |
| created\_at                       | timestamptz                        | not null                        | now()  | 创建时间   |
| updated\_at                       | timestamptz                        | not null                        | now()  | 更新时间   |

## 4. 沟通与任务

### crm\_communication\_log (沟通记录表)

| 字段名             | 数据类型        | 约束                              | 默认值    | 描述    |
| --------------- | ----------- | ------------------------------- | ------ | ----- |
| id              | text        | primary key                     | <br /> | 日志ID  |
| source\_id      | text        | <br />                          | <br /> | 来源ID  |
| customer\_id    | integer     | references ba\_manucustinfo(id) | <br /> | 客户ID  |
| date            | text        | <br />                          | <br /> | 日期    |
| sender          | text        | <br />                          | <br /> | 发送者   |
| content         | text        | <br />                          | <br /> | 内容    |
| type            | text        | <br />                          | <br /> | 类型    |
| attachment\_url | text        | <br />                          | <br /> | 附件URL |
| duration        | int         | <br />                          | <br /> | 时长    |
| source\_group   | text        | <br />                          | <br /> | 来源组   |
| is\_summarized  | boolean     | <br />                          | false  | 是否已总结 |
| created\_at     | timestamptz | not null                        | now()  | 创建时间  |

### crm\_task\_type (任务类型表)

| 字段名            | 数据类型        | 约束          | 默认值    | 描述    |
| -------------- | ----------- | ----------- | ------ | ----- |
| id             | text        | primary key | <br /> | 类型ID  |
| name           | text        | not null    | <br /> | 类型名称  |
| default\_hours | int         | <br />      | 24     | 默认小时数 |
| created\_at    | timestamptz | not null    | now()  | 创建时间  |
| updated\_at    | timestamptz | not null    | now()  | 更新时间  |

### crm\_task (任务表)

| 字段名             | 数据类型        | 约束          | 默认值    | 描述      |
| --------------- | ----------- | ----------- | ------ | ------- |
| id              | text        | primary key | <br /> | 任务ID    |
| title           | text        | not null    | <br /> | 标题      |
| description     | text        | <br />      | <br /> | 描述      |
| module          | text        | <br />      | <br /> | 模块      |
| related\_id     | text        | <br />      | <br /> | 相关ID    |
| source\_type    | text        | <br />      | <br /> | 来源类型    |
| source\_id      | text        | <br />      | <br /> | 来源ID    |
| task\_type      | text        | <br />      | <br /> | 任务类型    |
| objectives      | jsonb       | <br />      | <br /> | 目标      |
| auxiliary\_json | jsonb       | <br />      | <br /> | 辅助JSON  |
| status          | text        | <br />      | <br /> | 状态      |
| importance      | text        | <br />      | <br /> | 重要性     |
| urgency         | text        | <br />      | <br /> | 紧急性     |
| assignee\_id    | text        | <br />      | <br /> | 负责人ID   |
| assignee\_name  | text        | <br />      | <br /> | 负责人姓名   |
| due\_date       | date        | <br />      | <br /> | 截止日期    |
| create\_date    | date        | <br />      | <br /> | 创建日期    |
| creator\_id     | text        | <br />      | <br /> | 创建者ID   |
| creator\_name   | text        | <br />      | <br /> | 创建者姓名   |
| ai\_context\_id | text        | <br />      | <br /> | AI上下文ID |
| created\_at     | timestamptz | not null    | now()  | 创建时间    |
| updated\_at     | timestamptz | not null    | now()  | 更新时间    |

## 4.5 基础资料

### public\_property\_name (公共属性名称表)

| 字段名                 | 数据类型        | 约束                                   | 默认值    | 描述    |
| ------------------- | ----------- | ------------------------------------ | ------ | ----- |
| id                  | int         | not null auto\_increment primary key | <br /> | 主键ID  |
| specification\_name | text        | not null                             | <br /> | 规格名称  |
| group\_name         | text        | <br />                               | <br /> | 组名称   |
| image               | text        | <br />                               | <br /> | 图片    |
| is\_searchable      | int         | not null                             | 1      | 是否可搜索 |
| created\_at         | timestamptz | not null                             | now()  | 创建时间  |
| updated\_at         | timestamptz | not null                             | now()  | 更新时间  |

### public\_property\_value (公共属性值表)

| 字段名                    | 数据类型        | 约束                                             | 默认值    | 描述     |
| ---------------------- | ----------- | ---------------------------------------------- | ------ | ------ |
| id                     | int         | not null auto\_increment primary key           | <br /> | 主键ID   |
| property\_id           | int         | not null references public\_property\_name(id) | <br /> | 属性ID   |
| property\_value        | text        | not null                                       | <br /> | 属性值    |
| property\_value\_image | text        | <br />                                         | <br /> | 属性值图片  |
| public\_property\_name | text        | not null                                       | <br /> | 公共属性名称 |
| created\_at            | timestamptz | not null                                       | now()  | 创建时间   |
| updated\_at            | timestamptz | not null                                       | now()  | 更新时间   |

## 4.6 竞争对手与SWOT分析

### crm\_competitor (竞争对手表)

| 字段名             | 数据类型        | 约束          | 默认值    | 描述     |
| --------------- | ----------- | ----------- | ------ | ------ |
| id              | text        | primary key | <br /> | 竞争对手ID |
| name            | text        | not null    | <br /> | 竞争对手名称 |
| advantages      | text        | <br />      | <br /> | 优势     |
| disadvantages   | text        | <br />      | <br /> | 劣势     |
| positioning     | text        | <br />      | <br /> | 定位     |
| product\_matrix | jsonb       | not null    | '\[]'  | 产品矩阵   |
| created\_at     | timestamptz | not null    | now()  | 创建时间   |
| updated\_at     | timestamptz | not null    | now()  | 更新时间   |

### crm\_customer\_competitor (客户竞争对手表)

| 字段名            | 数据类型        | 约束                                                         | 默认值    | 描述     |
| -------------- | ----------- | ---------------------------------------------------------- | ------ | ------ |
| id             | text        | primary key                                                | <br /> | 主键ID   |
| customer\_id   | integer     | not null references ba\_manucustinfo(id) on delete cascade | <br /> | 客户ID   |
| competitor\_id | text        | not null references crm\_competitor(id) on delete cascade  | <br /> | 竞争对手ID |
| threat\_level  | text        | <br />                                                     | <br /> | 威胁等级   |
| notes          | text        | <br />                                                     | <br /> | 备注     |
| created\_at    | timestamptz | not null                                                   | now()  | 创建时间   |
| updated\_at    | timestamptz | not null                                                   | now()  | 更新时间   |

### crm\_customer\_focus\_swot (客户SWOT分析表)

| 字段名             | 数据类型        | 约束                                                         | 默认值    | 描述    |
| --------------- | ----------- | ---------------------------------------------------------- | ------ | ----- |
| id              | text        | primary key                                                | <br /> | 主键ID  |
| customer\_id    | integer     | not null references ba\_manucustinfo(id) on delete cascade | <br /> | 客户ID  |
| customer\_focus | text        | not null                                                   | ''     | 客户关注点 |
| key\_contact    | text        | not null                                                   | ''     | 关键联系人 |
| focus\_level    | int         | not null                                                   | 3      | 关注等级  |
| our\_strengths  | jsonb       | not null                                                   | '\[]'  | 我们的优势 |
| our\_weaknesses | jsonb       | not null                                                   | '\[]'  | 我们的劣势 |
| ai\_script      | text        | not null                                                   | ''     | AI话术  |
| sort\_order     | int         | not null                                                   | 0      | 排序顺序  |
| created\_at     | timestamptz | not null                                                   | now()  | 创建时间  |
| updated\_at     | timestamptz | not null                                                   | now()  | 更新时间  |

### crm\_customer\_focus\_competitor (客户竞争对手聚焦表)

| 字段名              | 数据类型        | 约束                                                                   | 默认值    | 描述     |
| ---------------- | ----------- | -------------------------------------------------------------------- | ------ | ------ |
| id               | text        | primary key                                                          | <br /> | 主键ID   |
| focus\_id        | text        | not null references crm\_customer\_focus\_swot(id) on delete cascade | <br /> | 聚焦ID   |
| customer\_id     | integer     | not null references ba\_manucustinfo(id) on delete cascade           | <br /> | 客户ID   |
| competitor\_name | text        | not null                                                             | ''     | 竞争对手名称 |
| strengths        | jsonb       | not null                                                             | '\[]'  | 优势     |
| weaknesses       | jsonb       | not null                                                             | '\[]'  | 劣势     |
| sort\_order      | int         | not null                                                             | 0      | 排序顺序   |
| created\_at      | timestamptz | not null                                                             | now()  | 创建时间   |
| updated\_at      | timestamptz | not null                                                             | now()  | 更新时间   |

## 4.7 干系人评估

### crm\_stakeholder\_assessment (干系人评估表)

| 字段名                        | 数据类型        | 约束                                                               | 默认值           | 描述     |
| -------------------------- | ----------- | ---------------------------------------------------------------- | ------------- | ------ |
| id                         | text        | primary key                                                      | <br />        | 主键ID   |
| customer\_id               | integer     | not null references ba\_manucustinfo(id) on delete cascade       | <br />        | 客户ID   |
| stakeholder\_id            | text        | not null references crm\_customer\_contact(id) on delete cascade | <br />        | 干系人ID  |
| assessment\_date           | date        | not null                                                         | current\_date | 评估日期   |
| need\_level\_score         | int         | <br />                                                           | <br />        | 需求等级评分 |
| power\_score               | int         | <br />                                                           | <br />        | 权力评分   |
| attitude\_score            | int         | <br />                                                           | <br />        | 态度评分   |
| relation\_score            | int         | <br />                                                           | <br />        | 关系评分   |
| business\_alignment\_score | int         | <br />                                                           | <br />        | 业务匹配评分 |
| confidence\_score          | int         | <br />                                                           | 60            | 置信度评分  |
| conclusion                 | text        | <br />                                                           | <br />        | 结论     |
| strategy\_suggestion       | text        | <br />                                                           | <br />        | 策略建议   |
| source\_type               | text        | <br />                                                           | 'manual'      | 来源类型   |
| ai\_model                  | text        | <br />                                                           | <br />        | AI模型   |
| created\_by                | text        | <br />                                                           | <br />        | 创建人    |
| created\_at                | timestamptz | not null                                                         | now()         | 创建时间   |

## 4.8 配置表

### crm\_customer\_follow\_strategy\_config (客户跟进策略配置表)

| 字段名         | 数据类型        | 约束          | 默认值    | 描述     |
| ----------- | ----------- | ----------- | ------ | ------ |
| id          | text        | primary key | <br /> | 主键ID   |
| config      | jsonb       | not null    | '{}'   | 配置JSON |
| created\_at | timestamptz | not null    | now()  | 创建时间   |
| updated\_at | timestamptz | not null    | now()  | 更新时间   |

### crm\_customer\_faq\_library\_config (客户FAQ库配置表)

| 字段名         | 数据类型        | 约束          | 默认值                  | 描述     |
| ----------- | ----------- | ----------- | -------------------- | ------ |
| id          | text        | primary key | <br />               | 主键ID   |
| config      | jsonb       | not null    | '{"categories":\[]}' | 配置JSON |
| created\_at | timestamptz | not null    | now()                | 创建时间   |
| updated\_at | timestamptz | not null    | now()                | 更新时间   |

### crm\_system\_config (系统配置表)

| 字段名         | 数据类型        | 约束          | 默认值    | 描述      |
| ----------- | ----------- | ----------- | ------ | ------- |
| id          | text        | primary key | <br /> | 主键ID    |
| name        | text        | <br />      | <br /> | 配置名称    |
| value\_json | jsonb       | not null    | '{}'   | 配置值JSON |
| updated\_at | timestamptz | not null    | now()  | 更新时间    |

### crm\_potential\_customer (潜在客户表)

| 字段名         | 数据类型        | 约束          | 默认值    | 描述   |
| ----------- | ----------- | ----------- | ------ | ---- |
| id          | text        | primary key | <br /> | 主键ID |
| name        | text        | not null    | <br /> | 名称   |
| created\_at | timestamptz | not null    | now()  | 创建时间 |
| updated\_at | timestamptz | not null    | now()  | 更新时间 |

## 4.9 销售文档

### crm\_quotation (报价单表)

| 字段名                          | 数据类型          | 约束                              | 默认值    | 描述     |
| ---------------------------- | ------------- | ------------------------------- | ------ | ------ |
| id                           | text          | primary key                     | <br /> | 报价单ID  |
| quote\_no                    | text          | <br />                          | <br /> | 报价单号   |
| customer\_id                 | integer       | references ba\_manucustinfo(id) | <br /> | 客户ID   |
| customer\_name               | text          | <br />                          | <br /> | 客户名称   |
| project\_id                  | text          | references crm\_project(id)     | <br /> | 项目ID   |
| project\_name                | text          | <br />                          | <br /> | 项目名称   |
| quote\_date                  | date          | <br />                          | <br /> | 报价日期   |
| status                       | text          | <br />                          | <br /> | 状态     |
| audit\_status                | text          | <br />                          | <br /> | 审核状态   |
| tax\_included\_total\_amount | numeric(18,2) | <br />                          | 0      | 含税总金额  |
| tax\_excluded\_total\_amount | numeric(18,2) | <br />                          | 0      | 不含税总金额 |
| total\_amount                | numeric(18,2) | <br />                          | 0      | 总金额    |
| created\_at                  | timestamptz   | not null                        | now()  | 创建时间   |
| updated\_at                  | timestamptz   | not null                        | now()  | 更新时间   |

### crm\_quotation\_item (报价单明细表)

| 字段名                   | 数据类型          | 约束                                                       | 默认值    | 描述    |
| --------------------- | ------------- | -------------------------------------------------------- | ------ | ----- |
| id                    | text          | primary key                                              | <br /> | 明细ID  |
| quotation\_id         | text          | not null references crm\_quotation(id) on delete cascade | <br /> | 报价单ID |
| product\_id           | integer       | references ba\_cpinfo(id)                                | <br /> | 产品ID  |
| product\_name         | text          | <br />                                                   | <br /> | 产品名称  |
| material\_no          | text          | <br />                                                   | <br /> | 物料编号  |
| quantity              | numeric(18,4) | <br />                                                   | 0      | 数量    |
| tax\_type             | text          | <br />                                                   | <br /> | 税种    |
| tax\_rate             | numeric(8,4)  | <br />                                                   | 0      | 税率    |
| tax\_included\_price  | numeric(18,4) | <br />                                                   | 0      | 含税单价  |
| tax\_excluded\_price  | numeric(18,4) | <br />                                                   | 0      | 不含税单价 |
| tax\_included\_amount | numeric(18,2) | <br />                                                   | 0      | 含税金额  |
| tax\_excluded\_amount | numeric(18,2) | <br />                                                   | 0      | 不含税金额 |
| tax\_amount           | numeric(18,2) | <br />                                                   | 0      | 税额    |
| created\_at           | timestamptz   | not null                                                 | now()  | 创建时间  |
| updated\_at           | timestamptz   | not null                                                 | now()  | 更新时间  |

### crm\_sales\_order (销售订单表)

| 字段名                          | 数据类型          | 约束                              | 默认值    | 描述     |
| ---------------------------- | ------------- | ------------------------------- | ------ | ------ |
| id                           | text          | primary key                     | <br /> | 订单ID   |
| order\_no                    | text          | <br />                          | <br /> | 订单号    |
| customer\_id                 | integer       | references ba\_manucustinfo(id) | <br /> | 客户ID   |
| customer\_name               | text          | <br />                          | <br /> | 客户名称   |
| project\_id                  | text          | references crm\_project(id)     | <br /> | 项目ID   |
| project\_name                | text          | <br />                          | <br /> | 项目名称   |
| order\_date                  | date          | <br />                          | <br /> | 订单日期   |
| status                       | text          | <br />                          | <br /> | 状态     |
| audit\_status                | text          | <br />                          | <br /> | 审核状态   |
| tax\_included\_total\_amount | numeric(18,2) | <br />                          | 0      | 含税总金额  |
| tax\_excluded\_total\_amount | numeric(18,2) | <br />                          | 0      | 不含税总金额 |
| total\_amount                | numeric(18,2) | <br />                          | 0      | 总金额    |
| created\_at                  | timestamptz   | not null                        | now()  | 创建时间   |
| updated\_at                  | timestamptz   | not null                        | now()  | 更新时间   |

### crm\_sales\_order\_item (销售订单明细表)

| 字段名                   | 数据类型          | 约束                                                          | 默认值    | 描述    |
| --------------------- | ------------- | ----------------------------------------------------------- | ------ | ----- |
| id                    | text          | primary key                                                 | <br /> | 明细ID  |
| sales\_order\_id      | text          | not null references crm\_sales\_order(id) on delete cascade | <br /> | 订单ID  |
| product\_id           | integer       | references ba\_cpinfo(id)                                   | <br /> | 产品ID  |
| product\_name         | text          | <br />                                                      | <br /> | 产品名称  |
| material\_no          | text          | <br />                                                      | <br /> | 物料编号  |
| quantity              | numeric(18,4) | <br />                                                      | 0      | 数量    |
| tax\_type             | text          | <br />                                                      | <br /> | 税种    |
| tax\_rate             | numeric(8,4)  | <br />                                                      | 0      | 税率    |
| tax\_included\_price  | numeric(18,4) | <br />                                                      | 0      | 含税单价  |
| tax\_excluded\_price  | numeric(18,4) | <br />                                                      | 0      | 不含税单价 |
| tax\_included\_amount | numeric(18,2) | <br />                                                      | 0      | 含税金额  |
| tax\_excluded\_amount | numeric(18,2) | <br />                                                      | 0      | 不含税金额 |
| tax\_amount           | numeric(18,2) | <br />                                                      | 0      | 税额    |
| created\_at           | timestamptz   | not null                                                    | now()  | 创建时间  |
| updated\_at           | timestamptz   | not null                                                    | now()  | 更新时间  |

### crm\_sample\_order (样品订单表)

| 字段名                          | 数据类型          | 约束                              | 默认值    | 描述     |
| ---------------------------- | ------------- | ------------------------------- | ------ | ------ |
| id                           | text          | primary key                     | <br /> | 样品订单ID |
| sample\_no                   | text          | <br />                          | <br /> | 样品单号   |
| customer\_id                 | integer       | references ba\_manucustinfo(id) | <br /> | 客户ID   |
| customer\_name               | text          | <br />                          | <br /> | 客户名称   |
| applicant                    | text          | <br />                          | <br /> | 申请人    |
| project\_id                  | text          | references crm\_project(id)     | <br /> | 项目ID   |
| project\_name                | text          | <br />                          | <br /> | 项目名称   |
| status                       | text          | <br />                          | <br /> | 状态     |
| audit\_status                | text          | <br />                          | <br /> | 审核状态   |
| tax\_included\_total\_amount | numeric(18,2) | <br />                          | 0      | 含税总金额  |
| tax\_excluded\_total\_amount | numeric(18,2) | <br />                          | 0      | 不含税总金额 |
| total\_amount                | numeric(18,2) | <br />                          | 0      | 总金额    |
| created\_at                  | timestamptz   | not null                        | now()  | 创建时间   |
| updated\_at                  | timestamptz   | not null                        | now()  | 更新时间   |

### crm\_sample\_order\_item (样品订单明细表)

| 字段名                   | 数据类型          | 约束                                                           | 默认值    | 描述     |
| --------------------- | ------------- | ------------------------------------------------------------ | ------ | ------ |
| id                    | text          | primary key                                                  | <br /> | 明细ID   |
| sample\_order\_id     | text          | not null references crm\_sample\_order(id) on delete cascade | <br /> | 样品订单ID |
| product\_id           | integer       | references ba\_cpinfo(id)                                    | <br /> | 产品ID   |
| product\_name         | text          | <br />                                                       | <br /> | 产品名称   |
| material\_no          | text          | <br />                                                       | <br /> | 物料编号   |
| quantity              | numeric(18,4) | <br />                                                       | 0      | 数量     |
| tax\_type             | text          | <br />                                                       | <br /> | 税种     |
| tax\_rate             | numeric(8,4)  | <br />                                                       | 0      | 税率     |
| tax\_included\_price  | numeric(18,4) | <br />                                                       | 0      | 含税单价   |
| tax\_excluded\_price  | numeric(18,4) | <br />                                                       | 0      | 不含税单价  |
| tax\_included\_amount | numeric(18,2) | <br />                                                       | 0      | 含税金额   |
| tax\_excluded\_amount | numeric(18,2) | <br />                                                       | 0      | 不含税金额  |
| tax\_amount           | numeric(18,2) | <br />                                                       | 0      | 税额     |
| created\_at           | timestamptz   | not null                                                     | now()  | 创建时间   |
| updated\_at           | timestamptz   | not null                                                     | now()  | 更新时间   |

### crm\_return\_order (退货订单表)

| 字段名                          | 数据类型          | 约束                              | 默认值    | 描述     |
| ---------------------------- | ------------- | ------------------------------- | ------ | ------ |
| id                           | text          | primary key                     | <br /> | 退货订单ID |
| return\_no                   | text          | <br />                          | <br /> | 退货单号   |
| order\_no                    | text          | <br />                          | <br /> | 订单号    |
| original\_order\_no          | text          | <br />                          | <br /> | 原订单号   |
| customer\_id                 | integer       | references ba\_manucustinfo(id) | <br /> | 客户ID   |
| customer\_name               | text          | <br />                          | <br /> | 客户名称   |
| reason                       | text          | <br />                          | <br /> | 原因     |
| handler                      | text          | <br />                          | <br /> | 处理人    |
| sales\_rep                   | text          | <br />                          | <br /> | 销售代表   |
| merchandiser                 | text          | <br />                          | <br /> | 跟单员    |
| project\_id                  | text          | references crm\_project(id)     | <br /> | 项目ID   |
| project\_name                | text          | <br />                          | <br /> | 项目名称   |
| status                       | text          | <br />                          | <br /> | 状态     |
| audit\_status                | text          | <br />                          | <br /> | 审核状态   |
| tax\_included\_total\_amount | numeric(18,2) | <br />                          | 0      | 含税总金额  |
| tax\_excluded\_total\_amount | numeric(18,2) | <br />                          | 0      | 不含税总金额 |
| created\_at                  | timestamptz   | not null                        | now()  | 创建时间   |
| updated\_at                  | timestamptz   | not null                        | now()  | 更新时间   |

### crm\_return\_order\_item (退货订单明细表)

| 字段名                           | 数据类型          | 约束                                                           | 默认值    | 描述     |
| ----------------------------- | ------------- | ------------------------------------------------------------ | ------ | ------ |
| id                            | text          | primary key                                                  | <br /> | 明细ID   |
| return\_order\_id             | text          | not null references crm\_return\_order(id) on delete cascade | <br /> | 退货订单ID |
| product\_id                   | integer       | references ba\_cpinfo(id)                                    | <br /> | 产品ID   |
| product\_name                 | text          | <br />                                                       | <br /> | 产品名称   |
| material\_no                  | text          | <br />                                                       | <br /> | 物料编号   |
| quantity                      | numeric(18,4) | <br />                                                       | 0      | 数量     |
| tax\_type                     | text          | <br />                                                       | <br /> | 税种     |
| tax\_rate                     | numeric(8,4)  | <br />                                                       | 0      | 税率     |
| tax\_included\_price          | numeric(18,4) | <br />                                                       | 0      | 含税单价   |
| tax\_excluded\_price          | numeric(18,4) | <br />                                                       | 0      | 不含税单价  |
| tax\_included\_amount         | numeric(18,2) | <br />                                                       | 0      | 含税金额   |
| tax\_excluded\_amount         | numeric(18,2) | <br />                                                       | 0      | 不含税金额  |
| tax\_amount                   | numeric(18,2) | <br />                                                       | 0      | 税额     |
| order\_no                     | text          | <br />                                                       | <br /> | 订单号    |
| return\_no                    | text          | <br />                                                       | <br /> | 退货单号   |
| material\_id                  | text          | <br />                                                       | <br /> | 物料ID   |
| material\_name                | text          | <br />                                                       | <br /> | 物料名称   |
| expected\_after\_sale\_method | text          | <br />                                                       | <br /> | 预期售后方式 |
| after\_sale\_reason           | text          | <br />                                                       | <br /> | 售后原因   |
| after\_sale\_material\_image  | text          | <br />                                                       | <br /> | 售后物料图片 |
| issue\_description            | text          | <br />                                                       | <br /> | 问题描述   |
| return\_tracking\_no          | text          | <br />                                                       | <br /> | 退货快递单号 |
| final\_handling\_method       | text          | <br />                                                       | <br /> | 最终处理方式 |
| return\_qty                   | numeric(18,4) | <br />                                                       | <br /> | 退货数量   |
| return\_method                | text          | <br />                                                       | <br /> | 退货方式   |
| created\_at                   | timestamptz   | not null                                                     | now()  | 创建时间   |
| updated\_at                   | timestamptz   | not null                                                     | now()  | 更新时间   |

## 4.10 本体/Ontology

### crm\_ontology\_object (本体对象表)

| 字段名            | 数据类型        | 约束              | 默认值    | 描述   |
| -------------- | ----------- | --------------- | ------ | ---- |
| id             | text        | primary key     | <br /> | 对象ID |
| name           | text        | not null        | <br /> | 对象名称 |
| code           | text        | not null unique | <br /> | 对象代码 |
| description    | text        | <br />          | <br /> | 描述   |
| system\_link   | text        | <br />          | <br /> | 系统链接 |
| is\_sub\_table | boolean     | <br />          | false  | 是否子表 |
| created\_at    | timestamptz | not null        | now()  | 创建时间 |
| updated\_at    | timestamptz | not null        | now()  | 更新时间 |

### crm\_ontology\_property (本体属性表)

| 字段名           | 数据类型    | 约束                                                                | 默认值    | 描述     |
| ------------- | ------- | ----------------------------------------------------------------- | ------ | ------ |
| id            | text    | primary key                                                       | <br /> | 属性ID   |
| object\_code  | text    | not null references crm\_ontology\_object(code) on delete cascade | <br /> | 对象代码   |
| name          | text    | not null                                                          | <br /> | 属性名称   |
| code          | text    | not null                                                          | <br /> | 属性代码   |
| type          | text    | <br />                                                            | <br /> | 类型     |
| required      | boolean | <br />                                                            | false  | 是否必需   |
| options\_json | jsonb   | <br />                                                            | '\[]'  | 选项JSON |

### crm\_ontology\_relation (本体关系表)

| 字段名                  | 数据类型 | 约束                                                                | 默认值    | 描述     |
| -------------------- | ---- | ----------------------------------------------------------------- | ------ | ------ |
| id                   | text | primary key                                                       | <br /> | 关系ID   |
| object\_code         | text | not null references crm\_ontology\_object(code) on delete cascade | <br /> | 对象代码   |
| target\_object\_code | text | not null                                                          | <br /> | 目标对象代码 |
| relation\_type       | text | <br />                                                            | <br /> | 关系类型   |
| description          | text | <br />                                                            | <br /> | 描述     |

### crm\_ontology\_flow (本体流程表)

| 字段名                | 数据类型 | 约束                                                                | 默认值    | 描述   |
| ------------------ | ---- | ----------------------------------------------------------------- | ------ | ---- |
| id                 | text | primary key                                                       | <br /> | 流程ID |
| object\_code       | text | not null references crm\_ontology\_object(code) on delete cascade | <br /> | 对象代码 |
| name               | text | not null                                                          | <br /> | 流程名称 |
| description        | text | <br />                                                            | <br /> | 描述   |
| trigger\_type      | text | <br />                                                            | <br /> | 触发类型 |
| trigger\_condition | text | <br />                                                            | <br /> | 触发条件 |
| trigger\_frequency | text | <br />                                                            | <br /> | 触发频率 |

### crm\_ontology\_node (本体节点表)

| 字段名          | 数据类型  | 约束                                                            | 默认值    | 描述     |
| ------------ | ----- | ------------------------------------------------------------- | ------ | ------ |
| id           | text  | primary key                                                   | <br /> | 节点ID   |
| flow\_id     | text  | not null references crm\_ontology\_flow(id) on delete cascade | <br /> | 流程ID   |
| name         | text  | <br />                                                        | <br /> | 节点名称   |
| description  | text  | <br />                                                        | <br /> | 描述     |
| type         | text  | <br />                                                        | <br /> | 节点类型   |
| config\_json | jsonb | <br />                                                        | '{}'   | 配置JSON |

### crm\_ontology\_flow\_draft (本体流程草稿表)

| 字段名                | 数据类型 | 约束                                                                | 默认值    | 描述   |
| ------------------ | ---- | ----------------------------------------------------------------- | ------ | ---- |
| id                 | text | primary key                                                       | <br /> | 草稿ID |
| object\_code       | text | not null references crm\_ontology\_object(code) on delete cascade | <br /> | 对象代码 |
| name               | text | not null                                                          | <br /> | 流程名称 |
| description        | text | <br />                                                            | <br /> | 描述   |
| trigger\_type      | text | <br />                                                            | <br /> | 触发类型 |
| trigger\_condition | text | <br />                                                            | <br /> | 触发条件 |
| trigger\_frequency | text | <br />                                                            | <br /> | 触发频率 |

### crm\_ontology\_node\_draft (本体节点草稿表)

| 字段名          | 数据类型  | 约束                                                                   | 默认值    | 描述     |
| ------------ | ----- | -------------------------------------------------------------------- | ------ | ------ |
| id           | text  | primary key                                                          | <br /> | 草稿节点ID |
| flow\_id     | text  | not null references crm\_ontology\_flow\_draft(id) on delete cascade | <br /> | 流程草稿ID |
| name         | text  | <br />                                                               | <br /> | 节点名称   |
| description  | text  | <br />                                                               | <br /> | 描述     |
| type         | text  | <br />                                                               | <br /> | 节点类型   |
| config\_json | jsonb | <br />                                                               | '{}'   | 配置JSON |

### crm\_ontology\_flow\_publish\_history (本体流程发布历史表)

| 字段名            | 数据类型        | 约束                                                                | 默认值    | 描述     |
| -------------- | ----------- | ----------------------------------------------------------------- | ------ | ------ |
| id             | uuid        | primary key default gen\_random\_uuid()                           | <br /> | 历史ID   |
| object\_code   | text        | not null references crm\_ontology\_object(code) on delete cascade | <br /> | 对象代码   |
| snapshot\_json | jsonb       | not null                                                          | <br /> | 快照JSON |
| created\_at    | timestamptz | not null                                                          | now()  | 创建时间   |

## 6. 索引

SQL 文件中定义了以下索引：

| 索引名                                                | 表名                               | 字段                                     |
| -------------------------------------------------- | -------------------------------- | -------------------------------------- |
| idx\_ba\_manucustinfo\_name                        | ba\_manucustinfo                 | name                                   |
| idx\_crm\_customer\_contact\_customer              | crm\_customer\_contact           | customer\_id                           |
| idx\_crm\_customer\_contact\_wechat\_id            | crm\_customer\_contact           | wechat\_id                             |
| idx\_crm\_customer\_persona\_customer              | crm\_customer\_persona           | customer\_id                           |
| idx\_crm\_inquiry\_customer                        | crm\_inquiry                     | customer\_id                           |
| idx\_crm\_lead\_customer                           | crm\_lead                        | customer\_id                           |
| idx\_crm\_opportunity\_customer                    | crm\_opportunity                 | customer\_id                           |
| idx\_crm\_project\_customer                        | crm\_project                     | customer\_id                           |
| idx\_crm\_task\_module                             | crm\_task                        | module                                 |
| idx\_crm\_customer\_competitor\_customer           | crm\_customer\_competitor        | customer\_id                           |
| idx\_crm\_focus\_swot\_customer                    | crm\_customer\_focus\_swot       | customer\_id                           |
| idx\_crm\_focus\_competitor\_focus                 | crm\_customer\_focus\_competitor | focus\_id                              |
| idx\_crm\_stakeholder\_assessment\_customer        | crm\_stakeholder\_assessment     | customer\_id                           |
| idx\_crm\_stakeholder\_assessment\_stakeholder     | crm\_stakeholder\_assessment     | stakeholder\_id, assessment\_date desc |
| idx\_crm\_potential\_customer\_name                | crm\_potential\_customer         | name                                   |
| idx\_crm\_product\_series\_category                | crm\_product\_series             | category\_id                           |
| idx\_ba\_brand\_status                             | ba\_brand                        | status                                 |
| idx\_ba\_product\_line\_parent\_id                 | ba\_product\_line                | parent\_id                             |
| idx\_public\_property\_value\_property\_id         | public\_property\_value          | property\_id                           |
| idx\_ba\_product\_property\_relation\_product\_id  | ba\_product\_property\_relation  | product\_id                            |
| idx\_ba\_product\_property\_relation\_category\_id | ba\_product\_property\_relation  | category\_id                           |
| idx\_ba\_spu\_brand\_id                            | ba\_spu                          | brand\_id                              |
| idx\_ba\_spu\_category\_id                         | ba\_spu                          | category\_id                           |
| idx\_ba\_cpinfo\_category\_id                      | ba\_cpinfo                       | category\_id                           |
| idx\_ba\_cpinfo\_brand\_id                         | ba\_cpinfo                       | brand\_id                              |
| idx\_ba\_cpinfo\_product\_line\_level1\_id         | ba\_cpinfo                       | product\_line\_level1\_id              |
| idx\_ba\_cpinfo\_product\_line\_level2\_id         | ba\_cpinfo                       | product\_line\_level2\_id              |
| idx\_ba\_cpinfo\_group\_id                         | ba\_cpinfo                       | group\_id                              |
| idx\_ba\_cpinfo\_spu\_id                           | ba\_cpinfo                       | spu\_id                                |
| idx\_ba\_cpinfo\_status                            | ba\_cpinfo                       | status                                 |
| idx\_ba\_cpinfo\_material\_no                      | ba\_cpinfo                       | material\_no                           |

## 7. 触发器与函数

### app\_meta.set\_updated\_at()

自动更新表的 `updated_at` 字段为当前时间。

```sql
create or replace function app_meta.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### app\_meta.attach\_updated\_at\_trigger()

为指定表创建更新触发器。

```sql
create or replace function app_meta.attach_updated_at_trigger(target_table text)
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists trg_set_updated_at on public.%I', target_table);
  execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function app_meta.set_updated_at()', target_table);
end;
$$;
```

自动应用更新触发器的表：

- ba\_employeeinfo, ba\_cptype, crm\_product\_series, ba\_cpinfo, ba\_manucustinfo
- crm\_customer\_contact, crm\_customer\_persona, crm\_inquiry, crm\_lead, crm\_opportunity, crm\_project
- crm\_task\_type, crm\_task, crm\_competitor, crm\_customer\_competitor, crm\_customer\_focus\_swot
- crm\_customer\_focus\_competitor, crm\_customer\_follow\_strategy\_config, crm\_customer\_faq\_library\_config
- crm\_quotation, crm\_quotation\_item, crm\_sales\_order, crm\_sales\_order\_item
- crm\_sample\_order, crm\_sample\_order\_item, crm\_return\_order, crm\_return\_order\_item
- crm\_ontology\_object, crm\_system\_config, crm\_potential\_customer
- ba\_brand, ba\_group, ba\_product\_line, public\_property\_name, public\_property\_value
- ba\_product\_property\_relation, ba\_spu

## 8. RLS 策略

所有表都应用了开放的 RLS（Row Level Security）策略，允许 `anon` 和 `authenticated` 角色进行完整的 CRUD 操作：

```sql
alter table public.{table_name} enable row level security;

create policy p_open_read on public.{table_name} for select to anon, authenticated using (true);
create policy p_open_insert on public.{table_name} for insert to anon, authenticated with check (true);
create policy p_open_update on public.{table_name} for update to anon, authenticated using (true) with check (true);
create policy p_open_delete on public.{table_name} for delete to anon, authenticated using (true);
```

这意味着所有表对所有用户都是完全开放的，无需额外认证。

### crm\_wechat\_session (微信会话表)

| 字段名              | 数据类型        | 约束          | 默认值                          | 描述     |
| ---------------- | ----------- | ----------- | ---------------------------- | ------ |
| id               | uuid        | primary key | gen\_random\_uuid()          | 会话ID   |
| my\_wechat\_id   | text        | not null    | <br />                       | 我的微信ID |
| peer\_wechat\_id | text        | not null    | <br />                       | 对方微信ID |
| customer\_id     | integer     | <br />      | <br />                       | 客户ID   |
| contact\_id      | text        | <br />      | <br />                       | 联系人ID  |
| created\_at      | timestamptz | not null    | timezone('utc'::text, now()) | 创建时间   |

### crm\_wechat\_message (微信消息表)

| 字段名                | 数据类型        | 约束                                                    | 默认值                          | 描述      |
| ------------------ | ----------- | ----------------------------------------------------- | ---------------------------- | ------- |
| id                 | uuid        | primary key                                           | gen\_random\_uuid()          | 消息ID    |
| session\_id        | uuid        | references crm\_wechat\_session(id) on delete cascade | <br />                       | 会话ID    |
| sender\_wechat\_id | text        | not null                                              | <br />                       | 发送方微信ID |
| msg\_type          | text        | <br />                                                | 'text'                       | 消息类型    |
| content            | text        | not null                                              | <br />                       | 消息内容    |
| send\_time         | timestamptz | not null                                              | timezone('utc'::text, now()) | 发送时间    |

### crm\_wechat\_group (微信群表)

| 字段名          | 数据类型        | 约束              | 默认值                          | 描述   |
| ------------ | ----------- | --------------- | ---------------------------- | ---- |
| id           | uuid        | primary key     | gen\_random\_uuid()          | 群ID  |
| group\_id    | text        | not null unique | <br />                       | 群ID  |
| group\_name  | text        | not null        | <br />                       | 群名称  |
| customer\_id | integer     | <br />          | <br />                       | 客户ID |
| created\_at  | timestamptz | not null        | timezone('utc'::text, now()) | 创建时间 |

### crm\_wechat\_group\_message (微信群消息表)

| 字段名                | 数据类型        | 约束                                                  | 默认值                          | 描述      |
| ------------------ | ----------- | --------------------------------------------------- | ---------------------------- | ------- |
| id                 | uuid        | primary key                                         | gen\_random\_uuid()          | 消息ID    |
| group\_id          | uuid        | references crm\_wechat\_group(id) on delete cascade | <br />                       | 群ID     |
| sender\_wechat\_id | text        | not null                                            | <br />                       | 发送方微信ID |
| msg\_type          | text        | <br />                                              | 'text'                       | 消息类型    |
| content            | text        | not null                                            | <br />                       | 消息内容    |
| send\_time         | timestamptz | not null                                            | timezone('utc'::text, now()) | 发送时间    |

