# 询盘录入功能增强计划

## 1. 目标与背景
用户希望在“询盘录入”过程中，能够“从接到询盘开始收集信息”（特别是“每一次沟通的信息等”）。
当前 `Inquiries.tsx`（询盘页面）详情区只有“SOP标准”标签页，未展示沟通记录（`CommunicationLog` 组件已导入但未使用）。
本计划将通过在询盘详情区增加“沟通记录”标签页，支持在询盘阶段就开始记录并持久化每次与客户的沟通信息。

## 2. 现状分析
- **组件引入情况**：`Inquiries.tsx` 已经引入了 `CommunicationLog` 组件，并且定义了 `communications` 和 `handleAddCommunication` 的基础状态，但没有在 UI 中渲染。
- **状态类型限制**：`activeDetailTab` 目前只定义了 `'flow'` 类型，需要扩展以支持 `'communications'`。
- **持久化问题**：现有的 `handleAddCommunication` 函数仅更新本地状态，未将沟通记录保存至 Supabase 数据库；同时也缺少加载历史沟通记录的逻辑。

## 3. 具体修改方案

### 3.1 修改文件：`src/pages/Inquiries.tsx`

**1. 扩展引入与状态定义**
- 从 `../lib/customerRepository` 补充引入持久化方法：`saveCustomerCommunicationToSupabase`, `fetchCustomerCommunicationsFromSupabase`。
- 修改 `activeDetailTab` 状态的类型：
  ```typescript
  const [activeDetailTab, setActiveDetailTab] = useState<'flow' | 'communications'>('flow');
  ```

**2. 加载历史沟通记录**
- 增加 `useEffect`，当 `selectedInquiry.customerId` 变化时，调用 `fetchCustomerCommunicationsFromSupabase` 获取当前客户的历史沟通记录，并设置到 `communications` 状态中。

**3. 完善沟通记录保存逻辑**
- 修改 `handleAddCommunication`，在更新本地状态后，调用 `saveCustomerCommunicationToSupabase` 将新的记录持久化至数据库。

**4. UI 渲染调整**
- 在详情页中，紧跟“SOP标准”按钮增加“沟通记录”按钮：
  ```tsx
  <button
    onClick={() => setActiveDetailTab('communications')}
    className={cn(
      "px-6 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
      activeDetailTab === 'communications'
        ? "border-indigo-600 text-indigo-600 bg-indigo-50/30"
        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
    )}
  >
    <MessageSquare className="w-4 h-4" />
    沟通记录
  </button>
  ```
- 增加对 `CommunicationLog` 的条件渲染：
  ```tsx
  {activeDetailTab === 'communications' && (
    <CommunicationLog
      onAddCommunication={handleAddCommunication}
      title="沟通记录"
      contacts={contacts}
      employees={[{ id: currentUser?.id || 'emp1', name: currentUser?.name || role, role: role }]}
      customerId={selectedInquiry.customerId}
      customerName={selectedInquiry.companyName || selectedInquiry.customerName}
      communications={communications}
    />
  )}
  ```

## 4. 影响与假设
- **假设**：所有需要记录沟通信息的询盘都会关联 `customerId`。只有关联了 `customerId` 才能真正实现记录的 Supabase 持久化。
- **影响**：此修改仅限于 UI 的扩展与 API 调用，对现有 SOP 标准及询盘表单保存无破坏性影响。

## 5. 验证步骤
1. 打开“询盘登记”页面，点击任意一个询盘查看详情。
2. 确认详情区选项卡中出现了“沟通记录”并可以切换。
3. 在“沟通记录”中新增一条记录（如微信或电话记录）。
4. 确认列表即时更新，且刷新页面后该沟通记录依然存在（数据持久化成功）。