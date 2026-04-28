# Supabase 表结构对照网格

## 使用说明

| 项     | 说明                            |
| ----- | ----------------------------- |
| 字段中文名 | 用于业务侧/产品侧对照                   |
| 字段类型  | 对应 `supabase_init.sql` 的数据库类型 |
| 映射值   | 仅在映射字段（外键、枚举、状态值）填写，普通字段留空    |

## ba\_employeeinfo（员工本体）

| 字段名         | 字段中文名 | 字段类型        | 映射值            |
| ----------- | ----- | ----------- | -------------- |
| id          | 员工ID  | text        | 主键             |
| no          | 员工编号  | text        | <br />         |
| name        | 员工姓名  | text        | <br />         |
| username    | 登录账号  | text        | <br />         |
| email       | 邮箱    | text        | <br />         |
| role        | 角色    | text        | 管理员/总监/业务员/客服等 |
| department  | 部门    | text        | 销售部/客服部/研发部等   |
| is\_active  | 是否启用  | boolean     | true/false     |
| created\_at | 创建时间  | timestamptz | <br />         |
| updated\_at | 更新时间  | timestamptz | <br />         |

## ba\_cptype（产品类别本体）

| 字段名             | 字段中文名  | 字段类型        | 映射值              |
| --------------- | ------ | ----------- | ---------------- |
| id              | 类别ID   | text        | 主键               |
| parent\_id      | 父级类别ID | text        | 关联 ba\_cptype.id |
| name            | 类别名称   | text        | <br />           |
| image           | 类别图片   | text        | 图片URL            |
| fab\_features   | FAB-特征 | text        | <br />           |
| fab\_advantages | FAB-优势 | text        | <br />           |
| fab\_benefits   | FAB-收益 | text        | <br />           |
| created\_at     | 创建时间   | timestamptz | <br />           |
| updated\_at     | 更新时间   | timestamptz | <br />           |

## ba\_brand（品牌）

| 字段名         | 字段中文名 | 字段类型        | 映射值    |
| ----------- | ----- | ----------- | ------ |
| id          | 主键    | text        | 主键     |
| name        | 名称    | text        | <br /> |
| status      | 状态    | text        | 启用/停用  |
| created\_at | 创建时间  | timestamptz | <br /> |
| updated\_at | 更新时间  | timestamptz | <br /> |

## ba\_belong\_group（归属小组）

| 字段名         | 字段中文名 | 字段类型        | 映射值                         |
| ----------- | ----- | ----------- | --------------------------- |
| id          | 主键    | text        | 主键                          |
| name        | 名称    | text        | <br />                      |
| owner       | 负责人   | text        | 可映射 ba\_employeeinfo.id 或姓名 |
| created\_at | 创建时间  | timestamptz | <br />                      |
| updated\_at | 更新时间  | timestamptz | <br />                      |

## ba\_product\_line（产品线）

| 字段名         | 字段中文名  | 字段类型        | 映射值                         |
| ----------- | ------ | ----------- | --------------------------- |
| id          | 主键     | text        | 主键                          |
| parent\_id  | 父级     | text        | 关联 ba\_product\_line.id     |
| name        | 产品线名称  | text        | <br />                      |
| owner       | 产品线负责人 | text        | 可映射 ba\_employeeinfo.id 或姓名 |
| created\_at | 创建时间   | timestamptz | <br />                      |
| updated\_at | 更新时间   | timestamptz | <br />                      |

## ba\_product\_category（品类）

| 字段名                     | 字段中文名  | 字段类型        | 映射值               |
| ----------------------- | ------ | ----------- | ----------------- |
| id                      | 主键     | text        | 主键                |
| product\_no             | 产品编号   | text        | <br />            |
| product\_name           | 产品名称   | text        | <br />            |
| category\_id            | 分类ID   | text        | 关联 ba\_cptype.id  |
| category\_name          | 分类名称   | text        | <br />            |
| product\_drawing        | 产品图纸   | text        | URL/文件标识          |
| status                  | 状态     | text        | 启用/停用/在售/停产等      |
| brand                   | 品牌     | text        | <br />            |
| supplier                | 供应商    | text        | <br />            |
| supplier\_no            | 供应商号   | text        | <br />            |
| supplier\_material\_no  | 供应商物料号 | text        | <br />            |
| supplier\_material\_name | 供应商物料名称 | text       | <br />            |
| brand\_id               | 品牌ID   | text        | 关联 ba\_brand.id   |
| created\_at             | 创建时间   | timestamptz | <br />            |
| updated\_at             | 更新时间   | timestamptz | <br />            |

## ba\_cpinfo（产品本体）

| 字段名                         | 字段中文名   | 字段类型          | 映射值                        |
| --------------------------- | ------- | ------------- | -------------------------- |
| id                          | 产品ID    | text          | 主键                         |
| product\_id                 | 产品ID(业务) | text          | 业务编码/外部主键                  |
| product\_name               | 产品名称(业务) | text          | <br />                     |
| category\_id                | 产品类别ID  | text          | 关联 ba\_cptype.id           |
| category\_name              | 分类名称    | text          | <br />                     |
| material\_no                | 产品编号    | text          | <br />                     |
| material\_name              | 产品名称    | text          | <br />                     |
| specification               | 规格型号    | text          | <br />                     |
| unit                        | 单位      | text          | pcs/set等                   |
| price                       | 价格      | numeric(18,2) | <br />                     |
| min\_price                  | 最低售价    | numeric(18,2) | <br />                     |
| min\_package\_qty           | 最小包装量   | numeric(18,4) | <br />                     |
| min\_order\_qty             | 最小起订量   | numeric(18,4) | <br />                     |
| status                      | 状态      | text          | 在售/停产/测试等                  |
| brand\_id                   | 品牌ID    | text          | 关联 ba\_brand.id            |
| brand                       | 品牌      | text          | <br />                     |
| brand\_name                 | 品牌名称    | text          | <br />                     |
| supplier                    | 供应商     | text          | <br />                     |
| supplier\_code              | 供应商号    | text          | <br />                     |
| supplier\_material\_no      | 供应商物料号  | text          | <br />                     |
| supplier\_material\_name    | 供应商物料名称 | text          | <br />                     |
| product\_line\_level\_1     | 产品线一级   | text          | 可映射 ba\_product\_line.id/name |
| product\_line\_level\_2     | 产品线二级   | text          | 可映射 ba\_product\_line.id/name |
| product\_ownership          | 产品归属    | text          | 自研/外发等                     |
| belong\_group\_id           | 归属小组ID  | text          | 关联 ba\_belong\_group.id    |
| belong\_group\_name         | 归属小组    | text          | <br />                     |
| belong\_group               | 归属小组(业务) | text         | <br />                     |
| outsource\_supplier\_drawing | 外发供应商图纸 | text          | URL/文件标识                   |
| drawing\_3d                 | 3D图纸    | text          | URL/文件标识                   |
| outsource\_customer\_drawing | 外发客户图纸 | text          | URL/文件标识                   |
| customer\_original\_drawing | 客户原图纸   | text          | URL/文件标识                   |
| drawing\_change\_details    | 变更图纸详情  | text          | <br />                     |
| specification\_doc          | 规格书     | text          | URL/文件标识                   |
| inspection\_standard\_doc   | 检验基准书   | text          | URL/文件标识                   |
| created\_at                 | 创建时间    | timestamptz   | <br />                     |
| updated\_at                 | 更新时间    | timestamptz   | <br />                     |

## ba\_manucustinfo（客户本体）

| 字段名                              | 字段中文名    | 字段类型        | 映射值                         |
| -------------------------------- | -------- | ----------- | --------------------------- |
| id                               | 客户ID     | text        | 主键                          |
| name                             | 客户名称     | text        | <br />                      |
| level                            | 客户等级     | text        | 战略客户/成长型客户/普通客户             |
| status                           | 客户状态     | text        | 活跃/休眠/流失                    |
| industry                         | 所属行业     | text        | <br />                      |
| source                           | 客户来源     | text        | <br />                      |
| payment\_term                    | 账期       | text        | <br />                      |
| has\_payment\_term               | 是否有账期    | boolean     | true/false                  |
| customer\_type                   | 客户类型     | text        | <br />                      |
| merchandiser                     | 跟单员      | text        | 可映射 ba\_employeeinfo.id 或姓名 |
| is\_public\_pool                 | 是否落入公海   | boolean     | true/false                  |
| month\_settlement\_apply\_status | 月结申请状态   | text        | <br />                      |
| business\_manager                | 业务经理     | text        | 可映射 ba\_employeeinfo.id 或姓名 |
| currency                         | 币别       | text        | CNY/USD 等                   |
| customer\_category               | 客户类别     | text        | 0''/1直销商/2经销商               |
| region                           | 区域       | text        | <br />                      |
| group\_name                      | 集团       | text        | <br />                      |
| is\_listed\_company              | 是否上市公司   | boolean     | true/false                  |
| short\_name                      | 客户简称     | text        | <br />                      |
| english\_name                    | 英文名称     | text        | <br />                      |
| insured\_count                   | 参保人数     | integer     | <br />                      |
| paid\_in\_capital                | 实缴资金     | text        | <br />                      |
| sales\_rep                       | 业务负责人    | text        | 可映射 ba\_employeeinfo.id 或姓名 |
| legal\_person                    | 法人       | text        | <br />                      |
| registered\_capital              | 注册资本     | text        | <br />                      |
| industry\_level\_1               | 一级行业     | text        | <br />                      |
| industry\_level\_2               | 二级行业     | text        | <br />                      |
| industry\_level\_3               | 三级行业     | text        | <br />                      |
| employee\_count                  | 员工规模     | text        | <br />                      |
| establishment\_date              | 成立日期     | date        | <br />                      |
| unified\_social\_credit\_code    | 统一社会信用代码 | text        | <br />                      |
| company\_address                 | 公司地址     | text        | <br />                      |
| company\_type                    | 企业类型     | text        | <br />                      |
| fax\_number                      | 传真号码     | text        | <br />                      |
| month\_settlement\_attachment    | 月结附件     | text        | URL/文件标识                    |
| month\_settlement\_agreement     | 月结协议     | text        | URL/文件标识                    |
| business\_scope                  | 经营范围     | text        | <br />                      |
| website                          | 官网       | text        | URL                         |
| last\_visit\_date                | 最后一次拜访日期 | date        | <br />                      |
| created\_at                      | 创建时间     | timestamptz | <br />                      |
| updated\_at                      | 更新时间     | timestamptz | <br />                      |

## crm\_customer\_contact（客户联系人）

| 字段名                | 字段中文名 | 字段类型        | 映射值                    |
| ------------------ | ----- | ----------- | ---------------------- |
| id                 | 联系人ID | text        | 主键                     |
| customer\_id       | 客户ID  | text        | 关联 ba\_manucustinfo.id |
| name               | 联系人姓名 | text        | <br />                 |
| position           | 职位    | text        | <br />                 |
| department         | 部门    | text        | <br />                 |
| phone              | 电话    | text        | <br />                 |
| email              | 邮箱    | text        | <br />                 |
| wechat\_id         | 微信号   | text        | <br />                 |
| is\_primary        | 首要联系人 | boolean     | true/false             |
| buying\_role       | 购买角色  | text        | 经济买家/技术买家/用户买家/教练      |
| buying\_mode       | 购买模式  | text        | 增长模式/困难模式/平稳模式/过度自信模式  |
| appellation        | 称呼    | text        | 张总/李工等                 |
| gender             | 性别    | text        | 男/女/其他                 |
| office\_phone      | 办公电话  | text        | <br />                 |
| fax\_number        | 传真号码  | text        | <br />                 |
| is\_employed       | 是否在职  | boolean     | true/false             |
| marital\_status    | 婚姻状况  | text        | 未婚/已婚等                 |
| hobbies            | 兴趣爱好  | text        | <br />                 |
| birth\_date        | 出生日期  | date        | <br />                 |
| highest\_education | 最高学历  | text        | <br />                 |
| native\_place      | 籍贯    | text        | <br />                 |
| religion           | 宗教    | text        | <br />                 |
| entry\_date        | 入职日期  | date        | <br />                 |
| is\_key\_person    | 是否关键人 | boolean     | true/false             |
| created\_at        | 创建时间  | timestamptz | <br />                 |
| updated\_at        | 更新时间  | timestamptz | <br />                 |

## crm\_customer\_material（客户物料）

| 字段名                      | 字段中文名  | 字段类型          | 映射值                    |
| ------------------------ | ------ | ------------- | ---------------------- |
| id                       | 主键     | text          | 主键                     |
| material\_no             | 物料编号   | text          | <br />                 |
| customer\_id             | 客户主键   | text          | 关联 ba\_manucustinfo.id |
| material\_name           | 物料名称   | text          | <br />                 |
| price                    | 价格     | numeric(18,2) | <br />                 |
| customer\_material\_no   | 客户物料编号 | text          | <br />                 |
| customer\_material\_name | 客户物料名称 | text          | <br />                 |

## crm\_customer\_persona（客户画像）

| 字段名                      | 字段中文名  | 字段类型        | 映射值                    |
| ------------------------ | ------ | ----------- | ---------------------- |
| id                       | 画像ID   | text        | 主键                     |
| customer\_id             | 客户ID   | text        | 关联 ba\_manucustinfo.id |
| scale                    | 企业规模   | text        | <br />                 |
| main\_products           | 主营产品   | text        | <br />                 |
| org\_structure           | 组织架构   | text        | <br />                 |
| buying\_mode             | 购买模式   | text        | 增长模式/困难模式/平稳模式/过度自信模式  |
| pain\_points             | 核心痛点   | text        | <br />                 |
| competitive\_supplier    | 竞品供应商  | text        | <br />                 |
| competitive\_preference  | 竞争偏好   | text        | <br />                 |
| unique\_needs            | 独特需求   | text        | <br />                 |
| rd\_requirements         | 研发要求   | text        | <br />                 |
| sample\_requirements     | 样品要求   | text        | <br />                 |
| production\_requirements | 生产要求   | text        | <br />                 |
| last\_updated            | 最近更新时间 | date        | <br />                 |
| created\_at              | 创建时间   | timestamptz | <br />                 |
| updated\_at              | 更新时间   | timestamptz | <br />                 |

## crm\_potential\_customer（潜在客户）

| 字段名         | 字段中文名  | 字段类型        | 映射值    |
| ----------- | ------ | ----------- | ------ |
| id          | 潜在客户ID | text        | 主键     |
| name        | 潜在客户名称 | text        | <br /> |
| created\_at | 创建时间   | timestamptz | <br /> |
| updated\_at | 更新时间   | timestamptz | <br /> |

## crm\_inquiry（询盘）

| 字段名               | 字段中文名  | 字段类型                                | 映射值                           |
| ----------------- | ------ | ----------------------------------- | ----------------------------- |
| id                | 询盘ID   | text                                | 主键                            |
| customer\_id      | 客户ID   | text                                | 关联 ba\_manucustinfo.id        |
| company\_name     | 公司名称   | text                                | <br />                        |
| customer\_name    | 客户名称   | text                                | <br />                        |
| contact           | 联系方式   | text                                | <br />                        |
| source\_channel   | 来源渠道   | crm\_inquiry\_source\_channel\_enum | 万连/电子谷/1688/爱采购/胜蓝/新电子谷/其他/淘宝 |
| category          | 产品类别   | text                                | 可映射 ba\_cptype.id 或名称         |
| product\_series   | 产品系列   | text                                | <br />                        |
| province          | 省市     | text                                | <br />                        |
| situation         | 客户情况   | text                                | <br />                        |
| customer\_inquiry | 客户咨询内容 | text                                | <br />                        |
| status            | 状态     | crm\_inquiry\_status\_enum          | 待处理/已转线索/未转化                  |
| classification    | 分类标签   | text                                | 处理中/有效/无效                     |
| unconvert\_reason | 未转化原因  | text                                | <br />                        |
| unconverted\_time | 未转化时间  | date                                | <br />                        |
| notes             | 备注     | text                                | <br />                        |
| attachments       | 附件     | jsonb                               | 附件数组（支持任意文件类型）               |
| associated\_lead  | 关联线索ID | text                                | 关联 crm\_lead.id               |
| create\_date      | 创建日期   | date                                | <br />                        |
| update\_date      | 更新日期   | date                                | <br />                        |
| creator\_id       | 创建人ID  | text                                | 可映射 ba\_employeeinfo.id       |
| creator\_name     | 创建人名称  | text                                | <br />                        |
| updater           | 更新人    | text                                | 可映射 ba\_employeeinfo.id 或姓名   |
| created\_at       | 创建时间   | timestamptz                         | <br />                        |
| updated\_at       | 更新时间   | timestamptz                         | <br />                        |

## crm\_lead（线索）

| 字段名                   | 字段中文名  | 字段类型                                | 映射值                           |
| --------------------- | ------ | ----------------------------------- | ----------------------------- |
| id                    | 线索ID   | text                                | 主键                            |
| customer\_id          | 客户ID   | text                                | 关联 ba\_manucustinfo.id        |
| customer\_type        | 客户类型   | text                                | 新客户/老客户                       |
| customer\_name        | 客户名称   | text                                | <br />                        |
| name                  | 联系人姓名  | text                                | <br />                        |
| phone                 | 联系人电话  | text                                | <br />                        |
| customer\_action      | 客户行动   | crm\_lead\_customer\_action\_enum   | 寻替代料/寻替代品/找货寻料/指定料号/指定物料      |
| industry              | 行业     | text                                | <br />                        |
| status                | 线索状态   | crm\_lead\_status\_enum             | 未跟进/跟进中/关闭/转商机                |
| classification        | 分类标签   | text                                | 处理中/有效/无效                     |
| assignee              | 负责人    | text                                | 可映射 ba\_employeeinfo.id 或姓名   |
| entry\_time           | 录入时间   | text                                | <br />                        |
| source\_channel       | 来源渠道   | crm\_inquiry\_source\_channel\_enum | 万连/电子谷/1688/爱采购/胜蓝/新电子谷/其他/淘宝 |
| source\_type          | 来源类型   | crm\_lead\_source\_type\_enum       | 企业微信/注册/在线/微信/邮件/电话/其他        |
| product\_category     | 产品类别   | text                                | 可映射 ba\_cptype.id 或名称         |
| product\_series       | 产品系列   | text                                | <br />                        |
| product\_industry     | 产品所属行业 | crm\_lead\_product\_industry\_enum  | 基础接插件/新能源/线束/定制/胜蓝/胜蓝电气/工业    |
| source\_status        | 来源状态   | crm\_lead\_source\_status\_enum     | 客服/自己开发                       |
| customer\_opportunity | 客户机会   | text                                | <br />                        |
| close\_time           | 关闭时间   | date                                | <br />                        |
| close\_reason         | 关闭原因   | text                                | <br />                        |
| inquiry\_id           | 来源询盘ID | text                                | 关联 crm\_inquiry.id            |
| contact\_id           | 联系人ID  | text                                | 关联 crm\_customer\_contact.id  |
| intent\_score         | 意向得分   | numeric(10,2)                       | <br />                        |
| buying\_mode          | 购买模式   | text                                | 增长模式/困难模式/平稳模式/过度自信模式         |
| buyer\_role           | 买家角色   | text                                | 经济买家/技术买家/用户买家/教练             |
| attachments           | 附件     | jsonb                               | 附件数组（支持任意文件类型）               |
| create\_date          | 创建日期   | date                                | <br />                        |
| creator\_id           | 创建人ID  | text                                | 可映射 ba\_employeeinfo.id       |
| creator\_name         | 创建人名称  | text                                | <br />                        |
| created\_at           | 创建时间   | timestamptz                         | <br />                        |
| updated\_at           | 更新时间   | timestamptz                         | <br />                        |

## crm\_opportunity（商机）

| 字段名                               | 字段中文名  | 字段类型                               | 映射值                               |
| --------------------------------- | ------ | ---------------------------------- | --------------------------------- |
| id                                | 商机ID   | text                               | 主键                                |
| customer\_id                      | 客户ID   | text                               | 关联 ba\_manucustinfo.id            |
| customer\_type                    | 客户类型   | text                               | 新客户/老客户                           |
| customer\_name                    | 客户名称   | text                               | <br />                            |
| opp\_date                         | 商机日期   | date                               | <br />                            |
| status                            | 商机状态   | crm\_opportunity\_status\_enum     | 未跟进/跟进中/关闭/转项目                    |
| opp\_summary                      | 商机概要   | text                               | <br />                            |
| close\_time                       | 关闭时间   | date                               | <br />                            |
| close\_reason                     | 关闭原因   | text                               | <br />                            |
| product\_line                     | 产品线    | crm\_product\_line\_enum           | 接插件/线束/工业连接器/IO连接器/电子电气/其他        |
| sales\_rep                        | 业务员    | text                               | 可映射 ba\_employeeinfo.id 或姓名       |
| project\_manager                  | 项目经理   | text                               | 可映射 ba\_employeeinfo.id 或姓名       |
| product\_owner                    | 产品负责人  | text                               | 可映射 ba\_employeeinfo.id 或姓名       |
| opp\_level                        | 商机等级   | text                               | S级/A级/B级等                         |
| intent\_amount                    | 意向金额   | numeric(18,2)                      | <br />                            |
| associated\_project               | 关联项目   | text                               | 关联 crm\_project.id 或名称            |
| end\_customer                     | 终端客户   | text                               | <br />                            |
| end\_project                      | 终端项目   | text                               | <br />                            |
| application\_scenario             | 应用场景   | text                               | <br />                            |
| estimated\_usage                  | 预估用量   | text                               | <br />                            |
| estimated\_mass\_production\_date | 预计量产时间 | date                               | <br />                            |
| sales\_type                       | 销售类型   | text                               | <br />                            |
| product\_industry                 | 产品所属行业 | crm\_lead\_product\_industry\_enum | 基础接插件/新能源/线束/定制/胜蓝/胜蓝电气/工业        |
| product\_series                   | 产品系列   | text                               | <br />                            |
| completeness                      | 完整度    | numeric(5,2)                       | 0-100                             |
| contact\_person                   | 客户联系人  | text                               | 可映射 crm\_customer\_contact.id 或名称 |
| lead\_id                          | 来源线索ID | text                               | 关联 crm\_lead.id                   |
| inquiry\_id                       | 来源询盘ID | text                               | 关联 crm\_inquiry.id                |
| attachments                      | 附件     | jsonb                              | 附件数组（支持任意文件类型）                 |
| created\_at                       | 创建时间   | timestamptz                        | <br />                            |
| updated\_at                       | 更新时间   | timestamptz                        | <br />                            |

## crm\_project（项目）

| 字段名                               | 字段中文名   | 字段类型                               | 映射值                                     |
| --------------------------------- | ------- | ---------------------------------- | --------------------------------------- |
| id                                | 项目ID    | text                               | 主键                                      |
| customer\_id                      | 客户ID    | text                               | 关联 ba\_manucustinfo.id                  |
| customer\_name                    | 客户名称    | text                               | <br />                                  |
| project\_name                     | 项目名称    | text                               | <br />                                  |
| status                            | 项目状态    | crm\_project\_status\_enum         | 跟进中/样品/小批量/已合作/关闭/暂停                    |
| stage                             | 项目阶段    | crm\_project\_stage\_enum          | 需求阶段/设计阶段/报价阶段/样品制作/样品承认/试产阶段/重复试产/量产阶段 |
| product\_line                     | 产品线     | crm\_product\_line\_enum           | 接插件/线束/工业连接器/IO连接器/电子电气/其他              |
| manager                           | 项目经理    | text                               | 可映射 ba\_employeeinfo.id 或姓名             |
| project\_type                     | 项目类型    | text                               | 研发型项目/标品类项目等                             |
| project\_level                    | 项目等级    | text                               | S级/A级/B级/C级                               |
| wechat\_group                     | 微信项目群   | text                               | <br />                                  |
| team                              | 项目团队(JSON) | jsonb                            | 销售/PM/产品/品质/采购/FAE                        |
| amount                            | 项目金额    | numeric(18,2)                      | <br />                                  |
| end\_customer                     | 终端客户    | text                               | <br />                                  |
| opp\_summary                      | 商机概要    | text                               | <br />                                  |
| application\_scenario             | 应用场景    | text                               | <br />                                  |
| intent\_amount                    | 意向金额    | numeric(18,2)                      | <br />                                  |
| end\_project                      | 终端项目    | text                               | <br />                                  |
| product\_industry                 | 产品所属行业  | crm\_lead\_product\_industry\_enum | 基础接插件/新能源/线束/定制/胜蓝/胜蓝电气/工业              |
| estimated\_usage                  | 预估用量    | text                               | <br />                                  |
| estimated\_mass\_production\_date | 预计量产时间  | date                               | <br />                                  |
| customer\_action                  | 客户行动    | crm\_lead\_customer\_action\_enum  | 寻替代料/寻替代品/找货寻料/指定料号/指定物料                |
| sales\_rep                        | 业务员     | text                               | 可映射 ba\_employeeinfo.id 或姓名             |
| product\_owner                    | 产品负责人   | text                               | 可映射 ba\_employeeinfo.id 或姓名             |
| quality\_owner                    | 品质负责人   | text                               | 可映射 ba\_employeeinfo.id 或姓名             |
| purchaser                         | 采购      | text                               | 可映射 ba\_employeeinfo.id 或姓名             |
| fae                               | FAE(人员) | text                               | 可映射 ba\_employeeinfo.id 或姓名             |
| lead\_id                          | 关联线索ID  | text                               | 关联 crm\_lead.id                         |
| opportunity\_id                   | 关联商机ID  | text                               | 关联 crm\_opportunity.id                  |
| inquiry\_id                       | 关联询盘ID  | text                               | 关联 crm\_inquiry.id                      |
| close\_time                       | 关闭时间    | date                               | <br />                                  |
| close\_reason                     | 关闭原因    | text                               | <br />                                  |
| notes                             | 项目备注(JSON) | jsonb                            | <br />                                  |
| requirements                      | 需求清单(JSON) | jsonb                            | <br />                                  |
| progress                          | 项目进度(JSON) | jsonb                            | <br />                                  |
| tasks                             | 项目任务(JSON) | jsonb                            | <br />                                  |
| samples                           | 样品记录(JSON) | jsonb                            | <br />                                  |
| purchasing\_quotes                | 采购报价(JSON) | jsonb                            | <br />                                  |
| quotations                        | 销售报价(JSON) | jsonb                            | <br />                                  |
| requirement\_changes              | 需求变更(JSON) | jsonb                            | <br />                                  |
| communication\_details            | 沟通明细(JSON) | jsonb                            | <br />                                  |
| attachments                       | 附件(JSON) | jsonb                            | 附件数组（支持任意文件类型）                         |
| is\_key\_project                  | 是否重点项目  | boolean                            | true/false                              |
| ai\_analysis                      | AI分析(JSON) | jsonb                            | <br />                                  |
| creator\_id                       | 创建人ID   | text                               | 可映射 ba\_employeeinfo.id                 |
| creator\_no                       | 创建人工号   | text                               | 可映射 ba\_employeeinfo.no                 |
| creator\_name                     | 创建人姓名   | text                               | <br />                                  |
| create\_date                      | 创建日期    | date                               | <br />                                  |
| start\_date                       | 开始日期    | date                               | <br />                                  |
| end\_date                         | 结束日期    | date                               | <br />                                  |
| created\_at                       | 创建时间    | timestamptz                        | <br />                                  |
| updated\_at                       | 更新时间    | timestamptz                        | <br />                                  |

## crm\_communication\_log（沟通记录）

| 字段名             | 字段中文名  | 字段类型        | 映射值                                         |
| --------------- | ------ | ----------- | ------------------------------------------- |
| id              | 记录ID   | text        | 主键                                          |
| source\_id      | 来源业务ID | text        | 询盘/线索/商机/项目ID                               |
| customer\_id    | 客户ID   | text        | 关联 ba\_manucustinfo.id                      |
| date            | 沟通时间   | text        | <br />                                      |
| sender          | 发送方    | text        | <br />                                      |
| content         | 沟通内容   | text        | <br />                                      |
| type            | 沟通类型   | text        | wechat/email/phone/meeting/screenshot/voice |
| attachment\_url | 附件地址   | text        | URL                                         |
| duration        | 时长     | integer     | 秒                                           |
| source\_group   | 来源群组   | text        | <br />                                      |
| created\_at     | 创建时间   | timestamptz | <br />                                      |

## crm\_task（任务）

| 字段名             | 字段中文名  | 字段类型        | 映射值                                      |
| --------------- | ------ | ----------- | ---------------------------------------- |
| id              | 任务ID   | text        | 主键                                       |
| title           | 标题     | text        | <br />                                   |
| description     | 描述     | text        | <br />                                   |
| module          | 所属模块   | text        | 询盘/线索/商机/项目/报价/订单/样品/退货等                 |
| related\_id     | 关联业务ID | text        | 关联对应业务主表ID                               |
| source\_type    | 来源类型   | text        | inquiry/lead/opportunity/project/visit 等 |
| source\_id      | 来源ID   | text        | 来源业务ID                                   |
| auxiliary\_json | 附加信息   | jsonb       | 工作流节点/提示词等                               |
| task\_type      | 任务类型   | text        | 普通任务/客户拜访/询盘处理等                          |
| status          | 任务状态   | text        | 待办/进行中/已完成等                              |
| importance      | 重要度    | text        | 高/中/低                                    |
| urgency         | 紧急度    | text        | 紧急/正常/低                                  |
| assignee\_id    | 执行人ID  | text        | 关联 ba\_employeeinfo.id                   |
| assignee\_name  | 执行人姓名  | text        | <br />                                   |
| due\_date       | 截止日期   | date        | <br />                                   |
| create\_date    | 创建日期   | date        | <br />                                   |
| creator\_id     | 创建人ID  | text        | 关联 ba\_employeeinfo.id                   |
| creator\_name   | 创建人姓名  | text        | <br />                                   |
| created\_at     | 创建时间   | timestamptz | <br />                                   |
| updated\_at     | 更新时间   | timestamptz | <br />                                   |

## crm\_task\_type（任务类型）

| 字段名            | 字段中文名 | 字段类型        | 映射值             |
| -------------- | ----- | ----------- | --------------- |
| id             | 类型ID  | text        | 主键              |
| name           | 类型名称  | text        | 客户拜访/样品跟进/报价跟进等 |
| default\_hours | 默认工时  | integer     | <br />          |
| created\_at    | 创建时间  | timestamptz | <br />          |
| updated\_at    | 更新时间  | timestamptz | <br />          |

## crm\_case\_library（案例库）

| 字段名            | 字段中文名 | 字段类型 | 映射值    |
| -------------- | ----- | ---- | ------ |
| id             | 案例ID  | text | 主键     |
| title          | 标题    | text | <br /> |
| customer\_name | 客户名称  | text | <br /> |
| industry       | 行业    | text | <br /> |
| pain\_points   | 痛点    | text | <br /> |
| solution       | 解决方案  | text | <br /> |
| metrics        | 指标结果  | text | <br /> |

## crm\_system\_config（系统配置）

| 字段名              | 字段中文名 | 字段类型        | 映射值              |
| ---------------- | ----- | ----------- | ---------------- |
| id               | 配置ID  | text        | 主键，如 llm\_config |
| name             | 配置名称  | text        | <br />           |
| value\_json      | 配置内容  | jsonb       | <br />           |
| updated\_at      | 更新时间  | timestamptz | <br />           |
| value\_statement | 价值陈述  | text        | <br />           |
| tags             | 标签    | text        | 建议JSON字符串或逗号分隔   |
| attachments      | 附件    | text        | 建议JSON字符串        |
| images           | 图片    | text        | 建议JSON字符串        |
| created\_at      | 创建时间  | timestamptz | <br />           |
| updated\_at      | 更新时间  | timestamptz | <br />           |

## crm\_case\_product\_rel（案例-产品映射）

| 字段名         | 字段中文名 | 字段类型 | 映射值                       |
| ----------- | ----- | ---- | ------------------------- |
| id          | 关系ID  | uuid | 主键，默认 gen\_random\_uuid() |
| case\_id    | 案例ID  | text | 关联 crm\_case\_library.id  |
| product\_id | 产品ID  | text | 关联 ba\_cpinfo.id          |

## crm\_case\_category\_rel（案例-类别映射）

| 字段名          | 字段中文名 | 字段类型 | 映射值                       |
| ------------ | ----- | ---- | ------------------------- |
| id           | 关系ID  | uuid | 主键，默认 gen\_random\_uuid() |
| case\_id     | 案例ID  | text | 关联 crm\_case\_library.id  |
| category\_id | 类别ID  | text | 关联 ba\_cptype.id          |

## 单据主表（crm\_quotation / crm\_sales\_order / crm\_sample\_order / crm\_return\_order）

| 表名                 | 字段名                           | 字段中文名       | 字段类型          | 映射值                            |
| ------------------ | ----------------------------- | ----------- | ------------- | ------------------------------ |
| crm\_quotation     | id                            | 报价单ID       | text          | 主键                             |
| crm\_quotation     | quote\_no                     | 报价单号        | text          | <br />                         |
| crm\_quotation     | customer\_id                  | 客户ID        | text          | 关联 ba\_manucustinfo.id         |
| crm\_quotation     | customer\_name                | 客户名称        | text          | <br />                         |
| crm\_quotation     | project\_id                   | 项目ID        | text          | 关联 crm\_project.id             |
| crm\_quotation     | project\_name                 | 项目名称        | text          | <br />                         |
| crm\_quotation     | contact\_name                 | 联系人         | text          | <br />                         |
| crm\_quotation     | contact\_phone                | 联系人电话       | text          | <br />                         |
| crm\_quotation     | quote\_date                   | 报价日期        | date          | <br />                         |
| crm\_quotation     | valid\_until                  | 有效时间        | date          | <br />                         |
| crm\_quotation     | delivery\_method              | 交货方式        | text          | <br />                         |
| crm\_quotation     | delivery\_time                | 交货时间        | date          | <br />                         |
| crm\_quotation     | payment\_method               | 付款方式        | text          | <br />                         |
| crm\_quotation     | status                        | 业务状态        | text          | 草稿/已发送/已接受/已拒绝                 |
| crm\_quotation     | audit\_status                 | 审核状态        | text          | 未审核/审核中/已审核                    |
| crm\_quotation     | quote\_price                  | 报价单价格       | numeric(18,2) | <br />                         |
| crm\_quotation     | tax\_included\_total\_amount  | 含税总额        | numeric(18,2) | <br />                         |
| crm\_quotation     | tax\_excluded\_total\_amount  | 不含税总额       | numeric(18,2) | <br />                         |
| crm\_quotation     | total\_amount                 | 合计金额        | numeric(18,2) | <br />                         |
| crm\_quotation     | created\_at                   | 创建时间        | timestamptz   | <br />                         |
| crm\_quotation     | updated\_at                   | 更新时间        | timestamptz   | <br />                         |
| crm\_sales\_order  | id                            | 订单ID        | text          | 主键                             |
| crm\_sales\_order  | order\_no                     | 订单号         | text          | <br />                         |
| crm\_sales\_order  | customer\_id                  | 客户ID        | text          | 关联 ba\_manucustinfo.id         |
| crm\_sales\_order  | customer\_name                | 客户名称        | text          | <br />                         |
| crm\_sales\_order  | order\_type                   | 订单类型        | text          | <br />                         |
| crm\_sales\_order  | project\_id                   | 项目ID        | text          | 关联 crm\_project.id             |
| crm\_sales\_order  | project\_name                 | 项目名称        | text          | <br />                         |
| crm\_sales\_order  | order\_date                   | 下单日期        | date          | <br />                         |
| crm\_sales\_order  | status                        | 业务状态        | text          | 待执行/执行中/已完成/已取消                |
| crm\_sales\_order  | audit\_status                 | 审核状态        | text          | 未审核/审核中/已审核                    |
| crm\_sales\_order  | actual\_received\_amount      | 实收金额        | numeric(18,2) | <br />                         |
| crm\_sales\_order  | pending\_received\_amount     | 待收金额        | numeric(18,2) | <br />                         |
| crm\_sales\_order  | payment\_status               | 付款状态        | text          | <br />                         |
| crm\_sales\_order  | payment\_method               | 支付方式        | text          | <br />                         |
| crm\_sales\_order  | payment\_time                 | 付款时间        | timestamptz   | <br />                         |
| crm\_sales\_order  | tax\_included\_total\_amount  | 含税总额        | numeric(18,2) | <br />                         |
| crm\_sales\_order  | tax\_excluded\_total\_amount  | 不含税总额       | numeric(18,2) | <br />                         |
| crm\_sales\_order  | total\_amount                 | 合计金额        | numeric(18,2) | <br />                         |
| crm\_sales\_order  | province                      | 省份          | text          | <br />                         |
| crm\_sales\_order  | city                          | 城市          | text          | <br />                         |
| crm\_sales\_order  | district                      | 区域          | text          | <br />                         |
| crm\_sales\_order  | shipping\_address             | 收货详细地址      | text          | <br />                         |
| crm\_sales\_order  | consignee\_name               | 收货人姓名       | text          | <br />                         |
| crm\_sales\_order  | consignee\_mobile             | 收货手机号码      | text          | <br />                         |
| crm\_sales\_order  | customer\_internal\_po\_no    | 客户内部采购单号    | text          | <br />                         |
| crm\_sales\_order  | third\_party\_transaction\_no | 第三方支付平台交易单号 | text          | <br />                         |
| crm\_sales\_order  | sales\_rep                    | 业务员         | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_sales\_order  | merchandiser                  | 跟单员         | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_sales\_order  | receipt\_time                 | 收款时间        | timestamptz   | <br />                         |
| crm\_sales\_order  | receipt\_voucher              | 收款凭证        | text          | URL/文件标识                       |
| crm\_sales\_order  | source\_doc\_no               | 源单据号        | text          | <br />                         |
| crm\_sales\_order  | source\_after\_sales\_no      | 源售后单号       | text          | <br />                         |
| crm\_sales\_order  | pre\_stock\_attachment        | 先备货附件       | text          | URL/文件标识                       |
| crm\_sales\_order  | pre\_stock\_reason            | 先备货原因       | text          | <br />                         |
| crm\_sales\_order  | created\_at                   | 创建时间        | timestamptz   | <br />                         |
| crm\_sales\_order  | updated\_at                   | 更新时间        | timestamptz   | <br />                         |
| crm\_sample\_order | id                            | 样品单ID       | text          | 主键                             |
| crm\_sample\_order | sample\_no                    | 样品单号        | text          | <br />                         |
| crm\_sample\_order | customer\_id                  | 客户ID        | text          | 关联 ba\_manucustinfo.id         |
| crm\_sample\_order | customer\_name                | 客户名称        | text          | <br />                         |
| crm\_sample\_order | applicant                     | 申请人         | text          | <br />                         |
| crm\_sample\_order | sales\_rep                    | 业务员         | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_sample\_order | merchandiser                  | 跟单员         | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_sample\_order | document\_maker               | 制单人         | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_sample\_order | document\_time                | 制单时间        | timestamptz   | <br />                         |
| crm\_sample\_order | project\_id                   | 项目ID        | text          | 关联 crm\_project.id             |
| crm\_sample\_order | project\_name                 | 项目名称        | text          | <br />                         |
| crm\_sample\_order | status                        | 业务状态        | text          | 进行中/已完成/已取消/待审批                |
| crm\_sample\_order | recipient                     | 收件人         | text          | <br />                         |
| crm\_sample\_order | mobile\_phone                 | 手机号         | text          | <br />                         |
| crm\_sample\_order | province                      | 省           | text          | <br />                         |
| crm\_sample\_order | city                          | 市           | text          | <br />                         |
| crm\_sample\_order | district                      | 区           | text          | <br />                         |
| crm\_sample\_order | detail\_address               | 详细地址        | text          | <br />                         |
| crm\_sample\_order | reject\_reason                | 驳回原因        | text          | <br />                         |
| crm\_sample\_order | reject\_time                  | 驳回时间        | timestamptz   | <br />                         |
| crm\_sample\_order | audit\_status                 | 审核状态        | text          | 未审核/审核中/已审核                    |
| crm\_sample\_order | tax\_included\_total\_amount  | 含税总额        | numeric(18,2) | <br />                         |
| crm\_sample\_order | tax\_excluded\_total\_amount  | 不含税总额       | numeric(18,2) | <br />                         |
| crm\_sample\_order | total\_amount                 | 合计金额        | numeric(18,2) | <br />                         |
| crm\_sample\_order | application\_note             | 申请试样说明      | text          | <br />                         |
| crm\_sample\_order | application\_attachment       | 申请附件        | text          | URL/文件标识                       |
| crm\_sample\_order | created\_at                   | 创建时间        | timestamptz   | <br />                         |
| crm\_sample\_order | updated\_at                   | 更新时间        | timestamptz   | <br />                         |
| crm\_return\_order | id                            | 退货单ID       | text          | 主键                             |
| crm\_return\_order | return\_no                    | 退货单号        | text          | <br />                         |
| crm\_return\_order | order\_no                     | 订单编号        | text          | <br />                         |
| crm\_return\_order | original\_order\_no           | 原始订单号       | text          | 关联 crm\_sales\_order.order\_no |
| crm\_return\_order | customer\_id                  | 客户ID        | text          | 关联 ba\_manucustinfo.id         |
| crm\_return\_order | customer\_name                | 客户名称        | text          | <br />                         |
| crm\_return\_order | after\_sale\_qty              | 售后数量        | numeric(18,4) | <br />                         |
| crm\_return\_order | after\_sale\_type             | 售后类型        | text          | <br />                         |
| crm\_return\_order | reason                        | 退货原因        | text          | <br />                         |
| crm\_return\_order | sales\_rep                    | 业务员         | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_return\_order | merchandiser                  | 跟单员         | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_return\_order | handler                       | 处理人         | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_return\_order | project\_id                   | 项目ID        | text          | 关联 crm\_project.id             |
| crm\_return\_order | project\_name                 | 项目名称        | text          | <br />                         |
| crm\_return\_order | status                        | 业务状态        | text          | 待处理/处理中/已完成                    |
| crm\_return\_order | audit\_status                 | 审核状态        | text          | 未审核/审核中/已审核                    |
| crm\_return\_order | tax\_included\_total\_amount  | 含税总额        | numeric(18,2) | <br />                         |
| crm\_return\_order | tax\_excluded\_total\_amount  | 不含税总额       | numeric(18,2) | <br />                         |
| crm\_return\_order | created\_at                   | 创建时间        | timestamptz   | <br />                         |
| crm\_return\_order | updated\_at                   | 更新时间        | timestamptz   | <br />                         |

## 采购报价单（crm\_purchase\_quotation）

| 表名                       | 字段名                 | 字段中文名  | 字段类型        | 映射值                         |
| ------------------------ | ------------------- | ------ | ----------- | --------------------------- |
| crm\_purchase\_quotation | id                  | 主键     | text        | 主键                          |
| crm\_purchase\_quotation | purchase\_quote\_no | 采购报价编号 | text        | <br />                      |
| crm\_purchase\_quotation | project\_id         | 关联项目   | text        | 关联 crm\_project.id          |
| crm\_purchase\_quotation | quote\_time         | 报价时间   | timestamptz | <br />                      |
| crm\_purchase\_quotation | supplier            | 供应商    | text        | <br />                      |
| crm\_purchase\_quotation | creator             | 创建人    | text        | 可映射 ba\_employeeinfo.id 或姓名 |
| crm\_purchase\_quotation | create\_date        | 创建日期   | date        | <br />                      |
| crm\_purchase\_quotation | updater             | 更新人    | text        | 可映射 ba\_employeeinfo.id 或姓名 |
| crm\_purchase\_quotation | update\_time        | 更新时间   | timestamptz | <br />                      |
| crm\_purchase\_quotation | customer\_name      | 客户名称   | text        | <br />                      |
| crm\_purchase\_quotation | validity\_date      | 有效期    | date        | <br />                      |
| crm\_purchase\_quotation | created\_at         | 创建时间   | timestamptz | <br />                      |
| crm\_purchase\_quotation | updated\_at         | 更新时间   | timestamptz | <br />                      |

## 单据细表（统一字段）

| 表名                       | 字段名                           | 字段中文名  | 字段类型          | 映射值                      |
| ------------------------ | ----------------------------- | ------ | ------------- | ------------------------ |
| crm\_quotation\_item     | id                            | 明细ID   | text          | 主键                       |
| crm\_quotation\_item     | quote\_no                     | 报价编号   | text          | <br />                   |
| crm\_quotation\_item     | quotation\_id                 | 报价单ID  | text          | 关联 crm\_quotation.id     |
| crm\_quotation\_item     | wanlian\_material\_no         | 万连料号   | text          | <br />                   |
| crm\_quotation\_item     | product\_id                   | 产品ID   | text          | 关联 ba\_cpinfo.id         |
| crm\_quotation\_item     | product\_name                 | 产品名称   | text          | <br />                   |
| crm\_quotation\_item     | material\_no                  | 产品编号   | text          | <br />                   |
| crm\_quotation\_item     | material\_desc                | 物料描述   | text          | <br />                   |
| crm\_quotation\_item     | unit                          | 单位     | text          | <br />                   |
| crm\_quotation\_item     | quantity                      | 数量     | numeric(18,4) | <br />                   |
| crm\_quotation\_item     | tax\_type                     | 税别     | text          | 增值税专票/增值税普票/无税           |
| crm\_quotation\_item     | tax\_rate                     | 税率     | numeric(8,4)  | %                        |
| crm\_quotation\_item     | tax\_included\_price          | 含税单价   | numeric(18,4) | <br />                   |
| crm\_quotation\_item     | currency                      | 币别     | text          | CNY/USD 等                |
| crm\_quotation\_item     | amount                        | 金额     | numeric(18,2) | <br />                   |
| crm\_quotation\_item     | lt                            | L/T    | text          | <br />                   |
| crm\_quotation\_item     | mpq                           | MPQ    | numeric(18,4) | <br />                   |
| crm\_quotation\_item     | moq                           | MOQ    | numeric(18,4) | <br />                   |
| crm\_quotation\_item     | sample\_price                 | 样品价    | numeric(18,4) | <br />                   |
| crm\_quotation\_item     | remarks                       | 备注     | text          | <br />                   |
| crm\_quotation\_item     | customer\_material\_no        | 客户物料号  | text          | <br />                   |
| crm\_quotation\_item     | material\_delivery\_date      | 物料交期   | date          | <br />                   |
| crm\_quotation\_item     | tax\_excluded\_price          | 不含税单价  | numeric(18,4) | <br />                   |
| crm\_quotation\_item     | tax\_included\_amount         | 含税金额   | numeric(18,2) | <br />                   |
| crm\_quotation\_item     | tax\_excluded\_amount         | 不含税金额  | numeric(18,2) | <br />                   |
| crm\_quotation\_item     | tax\_amount                   | 税额     | numeric(18,2) | <br />                   |
| crm\_quotation\_item     | created\_at                   | 创建时间   | timestamptz   | <br />                   |
| crm\_quotation\_item     | updated\_at                   | 更新时间   | timestamptz   | <br />                   |
| crm\_sales\_order\_item  | id                            | 明细ID   | text          | 主键                       |
| crm\_sales\_order\_item  | order\_no                     | 订单编号   | text          | <br />                   |
| crm\_sales\_order\_item  | sales\_order\_id              | 订单ID   | text          | 关联 crm\_sales\_order.id  |
| crm\_sales\_order\_item  | customer\_name                | 客户名称   | text          | <br />                   |
| crm\_sales\_order\_item  | material\_id                  | 物料ID   | text          | <br />                   |
| crm\_sales\_order\_item  | product\_id                   | 产品ID   | text          | 关联 ba\_cpinfo.id         |
| crm\_sales\_order\_item  | customer\_material\_no        | 客户物料号  | text          | <br />                   |
| crm\_sales\_order\_item  | product\_name                 | 产品名称   | text          | <br />                   |
| crm\_sales\_order\_item  | goods\_name                   | 商品名称   | text          | <br />                   |
| crm\_sales\_order\_item  | material\_no                  | 产品编号   | text          | <br />                   |
| crm\_sales\_order\_item  | purchase\_qty                 | 购买数量   | numeric(18,4) | <br />                   |
| crm\_sales\_order\_item  | quantity                      | 数量     | numeric(18,4) | <br />                   |
| crm\_sales\_order\_item  | list\_price                   | 物料面价   | numeric(18,4) | <br />                   |
| crm\_sales\_order\_item  | sales\_unit\_price            | 商品销售单价 | numeric(18,4) | <br />                   |
| crm\_sales\_order\_item  | line\_amount                  | 金额小计   | numeric(18,2) | <br />                   |
| crm\_sales\_order\_item  | original\_subtotal            | 原价小计   | numeric(18,2) | <br />                   |
| crm\_sales\_order\_item  | order\_type                   | 订单类型   | text          | <br />                   |
| crm\_sales\_order\_item  | customer\_delivery\_date      | 客户交期   | date          | <br />                   |
| crm\_sales\_order\_item  | delivery\_date                | 交期     | date          | <br />                   |
| crm\_sales\_order\_item  | package\_unit                 | 包装单位   | text          | <br />                   |
| crm\_sales\_order\_item  | shipping\_method              | 发货方式   | text          | <br />                   |
| crm\_sales\_order\_item  | tax\_excluded\_unit\_price    | 未税单价   | numeric(18,4) | <br />                   |
| crm\_sales\_order\_item  | tax\_excluded\_subtotal       | 未税小计   | numeric(18,2) | <br />                   |
| crm\_sales\_order\_item  | discount\_method              | 折扣方式   | text          | <br />                   |
| crm\_sales\_order\_item  | tax\_type                     | 税别     | text          | 增值税专票/增值税普票/无税           |
| crm\_sales\_order\_item  | tax\_rate                     | 税率     | numeric(8,4)  | %                        |
| crm\_sales\_order\_item  | tax\_included\_price          | 含税单价   | numeric(18,4) | <br />                   |
| crm\_sales\_order\_item  | tax\_excluded\_price          | 不含税单价  | numeric(18,4) | <br />                   |
| crm\_sales\_order\_item  | tax\_included\_amount         | 含税金额   | numeric(18,2) | <br />                   |
| crm\_sales\_order\_item  | tax\_excluded\_amount         | 不含税金额  | numeric(18,2) | <br />                   |
| crm\_sales\_order\_item  | tax\_amount                   | 税额     | numeric(18,2) | <br />                   |
| crm\_sales\_order\_item  | created\_at                   | 创建时间   | timestamptz   | <br />                   |
| crm\_sales\_order\_item  | updated\_at                   | 更新时间   | timestamptz   | <br />                   |
| crm\_sample\_order\_item | id                            | 明细ID   | text          | 主键                       |
| crm\_sample\_order\_item | sample\_no                    | 样品编号   | text          | <br />                   |
| crm\_sample\_order\_item | sample\_order\_id             | 样品单ID  | text          | 关联 crm\_sample\_order.id |
| crm\_sample\_order\_item | product\_id                   | 产品ID   | text          | 关联 ba\_cpinfo.id         |
| crm\_sample\_order\_item | product\_name                 | 产品名称   | text          | <br />                   |
| crm\_sample\_order\_item | material\_no                  | 产品编号   | text          | <br />                   |
| crm\_sample\_order\_item | customer\_material\_no        | 客户物料号  | text          | <br />                   |
| crm\_sample\_order\_item | customer\_material\_name      | 客户物料名称 | text          | <br />                   |
| crm\_sample\_order\_item | quantity                      | 数量     | numeric(18,4) | <br />                   |
| crm\_sample\_order\_item | material\_unit\_price         | 物料单价   | numeric(18,4) | <br />                   |
| crm\_sample\_order\_item | line\_total                   | 总计     | numeric(18,2) | <br />                   |
| crm\_sample\_order\_item | customer\_delivery\_date      | 客户交期   | date          | <br />                   |
| crm\_sample\_order\_item | tax\_type                     | 税别     | text          | 增值税专票/增值税普票/无税           |
| crm\_sample\_order\_item | tax\_rate                     | 税率     | numeric(8,4)  | %                        |
| crm\_sample\_order\_item | tax\_included\_price          | 含税单价   | numeric(18,4) | <br />                   |
| crm\_sample\_order\_item | tax\_excluded\_price          | 不含税单价  | numeric(18,4) | <br />                   |
| crm\_sample\_order\_item | tax\_included\_amount         | 含税金额   | numeric(18,2) | <br />                   |
| crm\_sample\_order\_item | tax\_excluded\_amount         | 不含税金额  | numeric(18,2) | <br />                   |
| crm\_sample\_order\_item | tax\_amount                   | 税额     | numeric(18,2) | <br />                   |
| crm\_sample\_order\_item | created\_at                   | 创建时间   | timestamptz   | <br />                   |
| crm\_sample\_order\_item | updated\_at                   | 更新时间   | timestamptz   | <br />                   |
| crm\_return\_order\_item | id                            | 明细ID   | text          | 主键                       |
| crm\_return\_order\_item | return\_order\_id             | 退货单ID  | text          | 关联 crm\_return\_order.id |
| crm\_return\_order\_item | order\_no                     | 订单编号   | text          | <br />                   |
| crm\_return\_order\_item | return\_no                    | 售后单号   | text          | <br />                   |
| crm\_return\_order\_item | material\_id                  | 物料ID   | text          | <br />                   |
| crm\_return\_order\_item | product\_id                   | 产品ID   | text          | 关联 ba\_cpinfo.id         |
| crm\_return\_order\_item | material\_name                | 物料名称   | text          | <br />                   |
| crm\_return\_order\_item | product\_name                 | 产品名称   | text          | <br />                   |
| crm\_return\_order\_item | material\_no                  | 产品编号   | text          | <br />                   |
| crm\_return\_order\_item | quantity                      | 数量     | numeric(18,4) | <br />                   |
| crm\_return\_order\_item | expected\_after\_sale\_method | 期望售后方式 | text          | <br />                   |
| crm\_return\_order\_item | after\_sale\_reason           | 售后原因   | text          | <br />                   |
| crm\_return\_order\_item | after\_sale\_material\_image  | 售后物料图片 | text          | URL/文件标识                 |
| crm\_return\_order\_item | issue\_description            | 问题描述   | text          | <br />                   |
| crm\_return\_order\_item | return\_tracking\_no          | 退回单号   | text          | <br />                   |
| crm\_return\_order\_item | final\_handling\_method       | 最终处理方式 | text          | <br />                   |
| crm\_return\_order\_item | return\_qty                   | 退货数量   | numeric(18,4) | <br />                   |
| crm\_return\_order\_item | tax\_type                     | 税别     | text          | 增值税专票/增值税普票/无税           |
| crm\_return\_order\_item | tax\_rate                     | 税率     | numeric(8,4)  | %                        |
| crm\_return\_order\_item | tax\_included\_price          | 含税单价   | numeric(18,4) | <br />                   |
| crm\_return\_order\_item | tax\_excluded\_price          | 不含税单价  | numeric(18,4) | <br />                   |
| crm\_return\_order\_item | tax\_included\_amount         | 含税金额   | numeric(18,2) | <br />                   |
| crm\_return\_order\_item | tax\_excluded\_amount         | 不含税金额  | numeric(18,2) | <br />                   |
| crm\_return\_order\_item | tax\_amount                   | 税额     | numeric(18,2) | <br />                   |
| crm\_return\_order\_item | return\_method                | 退货方式   | text          | 退回仓库/报废/换货等              |
| crm\_return\_order\_item | created\_at                   | 创建时间   | timestamptz   | <br />                   |
| crm\_return\_order\_item | updated\_at                   | 更新时间   | timestamptz   | <br />                   |

## 采购报价单明细（crm\_purchase\_quotation\_item）

| 表名                             | 字段名                        | 字段中文名  | 字段类型          | 映射值                            |
| ------------------------------ | -------------------------- | ------ | ------------- | ------------------------------ |
| crm\_purchase\_quotation\_item | id                         | 主键     | text          | 主键                             |
| crm\_purchase\_quotation\_item | material\_no               | 物料号    | text          | <br />                         |
| crm\_purchase\_quotation\_item | material\_desc             | 物料描述   | text          | <br />                         |
| crm\_purchase\_quotation\_item | tax\_included\_unit\_price | 含税单价   | numeric(18,4) | <br />                         |
| crm\_purchase\_quotation\_item | tax\_excluded\_unit\_price | 未含税单价  | numeric(18,4) | <br />                         |
| crm\_purchase\_quotation\_item | sample\_price              | 样品价格   | numeric(18,4) | <br />                         |
| crm\_purchase\_quotation\_item | unit                       | 单位     | text          | <br />                         |
| crm\_purchase\_quotation\_item | lt                         | L/T    | text          | <br />                         |
| crm\_purchase\_quotation\_item | moq                        | MOQ    | numeric(18,4) | <br />                         |
| crm\_purchase\_quotation\_item | mpq                        | MPQ    | numeric(18,4) | <br />                         |
| crm\_purchase\_quotation\_item | remarks                    | 备注     | text          | <br />                         |
| crm\_purchase\_quotation\_item | drawing                    | 图纸     | text          | URL/文件标识                       |
| crm\_purchase\_quotation\_item | purchase\_quotation\_id    | 采购报价id | text          | 关联 crm\_purchase\_quotation.id |
| crm\_purchase\_quotation\_item | creator                    | 创建人    | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_purchase\_quotation\_item | create\_date               | 创建日期   | date          | <br />                         |
| crm\_purchase\_quotation\_item | updater                    | 更新人    | text          | 可映射 ba\_employeeinfo.id 或姓名    |
| crm\_purchase\_quotation\_item | update\_time               | 更新时间   | timestamptz   | <br />                         |
| crm\_purchase\_quotation\_item | created\_at                | 创建时间   | timestamptz   | <br />                         |
| crm\_purchase\_quotation\_item | updated\_at                | 更新时间   | timestamptz   | <br />                         |

## 企微群

| 表名                  | 字段名              | 字段中文名  | 字段类型        | 映射值                                                 |
| ------------------- | ---------------- | ------ | ----------- | --------------------------------------------------- |
| crm\_group\_chat    | id               | 群记录ID  | text        | 主键                                                  |
| crm\_group\_chat    | group\_id        | 企微群ID  | text        | <br />                                              |
| crm\_group\_chat    | name             | 群名称    | text        | <br />                                              |
| crm\_group\_chat    | customer\_id     | 客户ID   | text        | 关联 ba\_manucustinfo.id                              |
| crm\_group\_chat    | created\_at      | 创建时间   | timestamptz | <br />                                              |
| crm\_group\_chat    | updated\_at      | 更新时间   | timestamptz | <br />                                              |
| crm\_group\_member  | id               | 成员关系ID | uuid        | 主键，默认 gen\_random\_uuid()                           |
| crm\_group\_member  | group\_chat\_id  | 群记录ID  | text        | 关联 crm\_group\_chat.id                              |
| crm\_group\_member  | wechat\_user\_id | 企微用户ID | text        | <br />                                              |
| crm\_group\_member  | wechat\_nickname | 企微昵称   | text        | <br />                                              |
| crm\_group\_member  | mapped\_type     | 映射类型   | text        | user/contact/unmapped                               |
| crm\_group\_member  | mapped\_id       | 映射对象ID | text        | 可映射 ba\_employeeinfo.id / crm\_customer\_contact.id |
| crm\_group\_member  | mapped\_name     | 映射对象名称 | text        | <br />                                              |
| crm\_group\_message | id               | 消息ID   | uuid        | 主键，默认 gen\_random\_uuid()                           |
| crm\_group\_message | group\_chat\_id  | 群记录ID  | text        | 关联 crm\_group\_chat.id                              |
| crm\_group\_message | sender           | 发送人    | text        | <br />                                              |
| crm\_group\_message | content          | 消息内容   | text        | <br />                                              |
| crm\_group\_message | send\_time       | 发送时间   | timestamptz | <br />                                              |

## 微信会话（V015/V016 新增）

| 表名                          | 字段名                | 字段中文名   | 字段类型        | 映射值                           |
| --------------------------- | ------------------ | ------- | ----------- | ----------------------------- |
| crm\_wechat\_session        | id                 | 会话ID    | uuid        | 主键，默认 gen\_random\_uuid()     |
| crm\_wechat\_session        | my\_wechat\_id     | 我方微信号   | text        | <br />                        |
| crm\_wechat\_session        | peer\_wechat\_id   | 对方微信号   | text        | <br />                        |
| crm\_wechat\_session        | customer\_id       | 匹配客户ID  | text        | 可映射 ba\_manucustinfo.id       |
| crm\_wechat\_session        | contact\_id        | 匹配联系人ID | text        | 可映射 crm\_customer\_contact.id |
| crm\_wechat\_session        | created\_at        | 创建时间    | timestamptz | <br />                        |
| crm\_wechat\_message        | id                 | 消息ID    | uuid        | 主键，默认 gen\_random\_uuid()     |
| crm\_wechat\_message        | session\_id        | 会话ID    | uuid        | 关联 crm\_wechat\_session.id    |
| crm\_wechat\_message        | sender\_wechat\_id | 发送人微信号  | text        | <br />                        |
| crm\_wechat\_message        | msg\_type          | 消息类型    | text        | text/image/audio/file 等       |
| crm\_wechat\_message        | content            | 消息内容    | text        | <br />                        |
| crm\_wechat\_message        | send\_time         | 发送时间    | timestamptz | <br />                        |
| crm\_wechat\_group          | id                 | 群会话ID   | uuid        | 主键，默认 gen\_random\_uuid()     |
| crm\_wechat\_group          | group\_id          | 微信群ID   | text        | 唯一                            |
| crm\_wechat\_group          | group\_name        | 微信群名称   | text        | <br />                        |
| crm\_wechat\_group          | customer\_id       | 匹配客户ID  | text        | 可映射 ba\_manucustinfo.id       |
| crm\_wechat\_group          | created\_at        | 创建时间    | timestamptz | <br />                        |
| crm\_wechat\_group\_member  | id                 | 群成员记录ID | uuid        | 主键，默认 gen\_random\_uuid()     |
| crm\_wechat\_group\_member  | group\_id          | 群会话ID   | uuid        | 关联 crm\_wechat\_group.id      |
| crm\_wechat\_group\_member  | wechat\_id         | 成员微信号   | text        | <br />                        |
| crm\_wechat\_group\_member  | wechat\_name       | 成员昵称    | text        | <br />                        |
| crm\_wechat\_group\_member  | is\_internal       | 是否内部人员  | boolean     | true/false                    |
| crm\_wechat\_group\_member  | contact\_id        | 匹配联系人ID | text        | 可映射 crm\_customer\_contact.id |
| crm\_wechat\_group\_message | id                 | 群消息ID   | uuid        | 主键，默认 gen\_random\_uuid()     |
| crm\_wechat\_group\_message | group\_id          | 群会话ID   | uuid        | 关联 crm\_wechat\_group.id      |
| crm\_wechat\_group\_message | sender\_wechat\_id | 发送人微信号  | text        | <br />                        |
| crm\_wechat\_group\_message | msg\_type          | 消息类型    | text        | text/image/audio/file 等       |
| crm\_wechat\_group\_message | content            | 消息内容    | text        | <br />                        |
| crm\_wechat\_group\_message | send\_time         | 发送时间    | timestamptz | <br />                        |

## 架构本体元数据

| 表名                                    | 字段名                  | 字段中文名  | 字段类型        | 映射值                                            |
| ------------------------------------- | -------------------- | ------ | ----------- | ---------------------------------------------- |
| crm\_ontology\_object                 | id                   | 本体ID   | text        | 主键                                             |
| crm\_ontology\_object                 | name                 | 本体名称   | text        | <br />                                         |
| crm\_ontology\_object                 | code                 | 本体编码   | text        | 唯一，如 ba\_cpinfo/crm\_inquiry                   |
| crm\_ontology\_object                 | description          | 描述     | text        | <br />                                         |
| crm\_ontology\_object                 | system\_link         | 系统映射表  | text        | <br />                                         |
| crm\_ontology\_object                 | is\_sub\_table       | 是否细表   | boolean     | true/false                                     |
| crm\_ontology\_object                 | created\_at          | 创建时间   | timestamptz | <br />                                         |
| crm\_ontology\_object                 | updated\_at          | 更新时间   | timestamptz | <br />                                         |
| crm\_ontology\_property               | id                   | 属性ID   | text        | 主键                                             |
| crm\_ontology\_property               | object\_code         | 本体编码   | text        | 关联 crm\_ontology\_object.code                  |
| crm\_ontology\_property               | name                 | 属性名称   | text        | <br />                                         |
| crm\_ontology\_property               | code                 | 属性编码   | text        | <br />                                         |
| crm\_ontology\_property               | type                 | 属性类型   | text        | String/Number/Enum/Date/DateTime/Text/Boolean等 |
| crm\_ontology\_property               | required             | 是否必填   | boolean     | true/false                                     |
| crm\_ontology\_property               | options\_json        | 枚举选项   | jsonb       | Enum映射值JSON                                    |
| crm\_ontology\_relation               | id                   | 关系ID   | text        | 主键                                             |
| crm\_ontology\_relation               | object\_code         | 源本体编码  | text        | 关联 crm\_ontology\_object.code                  |
| crm\_ontology\_relation               | target\_object\_code | 目标本体编码 | text        | 关联 crm\_ontology\_object.code                  |
| crm\_ontology\_relation               | relation\_type       | 关系类型   | text        | 1:1/1:N/N:1/N:N                                |
| crm\_ontology\_relation               | description          | 关系说明   | text        | <br />                                         |
| crm\_ontology\_flow                   | id                   | 流程ID   | text        | 主键                                             |
| crm\_ontology\_flow                   | object\_code         | 本体编码   | text        | 关联 crm\_ontology\_object.code                  |
| crm\_ontology\_flow                   | name                 | 流程名称   | text        | <br />                                         |
| crm\_ontology\_flow                   | description          | 流程描述   | text        | <br />                                         |
| crm\_ontology\_flow                   | trigger\_type        | 触发类型   | text        | button/auto/timed                              |
| crm\_ontology\_flow                   | trigger\_condition   | 触发条件   | text        | <br />                                         |
| crm\_ontology\_flow                   | trigger\_frequency   | 触发频率   | text        | 定时表达式或频次                                       |
| crm\_ontology\_node                   | id                   | 节点ID   | text        | 主键                                             |
| crm\_ontology\_node                   | flow\_id             | 流程ID   | text        | 关联 crm\_ontology\_flow\.id                     |
| crm\_ontology\_node                   | name                 | 节点名称   | text        | <br />                                         |
| crm\_ontology\_node                   | description          | 节点描述   | text        | <br />                                         |
| crm\_ontology\_node                   | type                 | 节点类型   | text        | automatic/manual/push\_down/condition          |
| crm\_ontology\_node                   | config\_json         | 节点配置   | jsonb       | 节点参数JSON                                       |
| crm\_ontology\_flow\_draft            | id                   | 流程ID   | text        | 草稿主键                                           |
| crm\_ontology\_flow\_draft            | object\_code         | 本体编码   | text        | 关联 crm\_ontology\_object.code                  |
| crm\_ontology\_flow\_draft            | name                 | 流程名称   | text        | <br />                                         |
| crm\_ontology\_flow\_draft            | description          | 流程描述   | text        | <br />                                         |
| crm\_ontology\_flow\_draft            | trigger\_type        | 触发类型   | text        | button/auto/timed                              |
| crm\_ontology\_flow\_draft            | trigger\_condition   | 触发条件   | text        | <br />                                         |
| crm\_ontology\_flow\_draft            | trigger\_frequency   | 触发频率   | text        | <br />                                         |
| crm\_ontology\_node\_draft            | id                   | 节点ID   | text        | 草稿主键                                           |
| crm\_ontology\_node\_draft            | flow\_id             | 流程ID   | text        | 关联 crm\_ontology\_flow\_draft.id               |
| crm\_ontology\_node\_draft            | name                 | 节点名称   | text        | <br />                                         |
| crm\_ontology\_node\_draft            | description          | 节点描述   | text        | <br />                                         |
| crm\_ontology\_node\_draft            | type                 | 节点类型   | text        | automatic/manual/push\_down/condition          |
| crm\_ontology\_node\_draft            | config\_json         | 节点配置   | jsonb       | 节点参数JSON                                       |
| crm\_ontology\_flow\_publish\_history | id                   | 历史ID   | uuid        | 主键                                             |
| crm\_ontology\_flow\_publish\_history | object\_code         | 本体编码   | text        | 关联 crm\_ontology\_object.code                  |
| crm\_ontology\_flow\_publish\_history | snapshot\_json       | 快照JSON | jsonb       | 含 flows/nodes 快照                               |
| crm\_ontology\_flow\_publish\_history | created\_at          | 创建时间   | timestamptz | crm\_sample\_order                             |
