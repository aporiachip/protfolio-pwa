# 个人股票持仓 PWA / Personal Stock Portfolio PWA

## 中文版

这是一个离线优先的个人股票持仓管理 PWA。它不需要后端，默认把所有持仓数据保存在你当前浏览器的本地存储中。

### 你可以用它做什么

- 在线搜索并验证股票代码，自动获取最新价格后添加持仓
- 添加、编辑、删除股票持仓
- 点击某个持仓进入详情页，然后加仓或减仓
- 每个合约显示股数、最新价、成本、收益率和仓位占比
- 查看总市值、总成本、浮动盈亏和收益率
- 搜索持仓
- 按市值、盈亏或代码排序
- 导出 JSON 文件备份
- 从 JSON 文件恢复数据
- 添加到 iPhone 主屏幕后像 App 一样打开
- 首次加载完成后离线使用

### 重要说明

- 数据默认只保存在当前设备、当前浏览器里。
- 删除浏览器网站数据、清理 Safari 数据或卸载主屏幕 App，可能会清除本地数据。
- 建议定期在“数据”页导出 JSON 备份。
- iPhone 添加到主屏幕和 Service Worker 离线缓存通常需要通过 HTTPS 访问。
- 电脑上的 `http://127.0.0.1:8000/` 只能给这台电脑自己访问，手机不能直接使用这个地址。

### 在电脑本地预览

在项目目录运行：

```powershell
C:\Python314\python.exe -m http.server 8000 --bind 127.0.0.1
```

然后在电脑浏览器打开：

```text
http://127.0.0.1:8000/
```

这个方式适合开发和预览，但不适合直接给 iPhone 添加到主屏幕。

### 在 iPhone 上使用

1. 将这个项目部署到一个支持 HTTPS 的静态网站托管服务。

   可选方案包括 GitHub Pages、Cloudflare Pages、Netlify、Vercel 或任何能托管静态文件的 HTTPS 服务。

2. 部署时上传这些文件和目录：

```text
index.html
styles.css
app.js
sw.js
manifest.webmanifest
assets/
```

3. 部署完成后，复制 HTTPS 网址，例如：

```text
https://your-site.example.com/
```

4. 在 iPhone 上打开 Safari。

5. 用 Safari 访问你的 HTTPS 网址。

6. 等页面完整加载一次。

7. 点击 Safari 底部的分享按钮。

8. 选择“添加到主屏幕”。

9. 确认名称，例如“持仓”，然后点击“添加”。

10. 回到 iPhone 主屏幕，点击新图标打开。

添加成功后，它会以独立窗口运行，看起来更像一个普通 App。

### 离线使用方式

首次通过 HTTPS 打开后，浏览器会缓存应用文件。之后即使没有网络，也可以从主屏幕图标打开并查看、编辑本地持仓数据。

为了确保离线可用，建议第一次打开后做一次测试：

1. 在有网络时打开主屏幕上的“持仓”。
2. 添加一条测试持仓。
3. 关闭 App。
4. 打开飞行模式。
5. 再次从主屏幕打开“持仓”。
6. 确认页面能打开，刚才的数据仍然存在。

### 持仓和加减仓

新增第一笔持仓：

1. 打开 App。
2. 点击“新增”。
3. 输入代码或公司名称（例如 `INTC`），点击“搜索”。
4. 确认搜索到的股票和最新价格；如果输入的是精确代码，会自动选择。
5. 填写数量和买入价。
6. 点击“保存持仓”。

应用会检查股票是否存在，并用行情中的币种记录价格。搜索和获取最新价格需要联网；已保存的持仓仍可离线查看。

加仓或减仓：

1. 回到“持仓”页。
2. 点击某一行持仓。
3. 在底部详情页选择“加仓”或“减仓”。
4. 输入成交数量和成交价。
5. 点击确认。

加仓会按新买入金额重新计算平均成本；减仓会减少数量，并保留原平均成本。成交价会同步更新为当前现价。

### 备份和恢复

备份：

1. 打开 App。
2. 切换到“数据”页。
3. 点击“导出 JSON”。
4. 将下载的 JSON 文件保存到 iCloud Drive、文件 App 或其他安全位置。

恢复：

1. 打开 App。
2. 切换到“数据”页。
3. 点击“导入 JSON”。
4. 选择之前导出的 JSON 文件。

导入会替换当前本地持仓列表。导入前建议先导出一份当前数据。

### 常见问题

**为什么 iPhone 不能打开 `127.0.0.1`？**

`127.0.0.1` 永远指向当前设备自己。在电脑上它指向电脑，在 iPhone 上它指向 iPhone 本身，所以 iPhone 不能通过这个地址访问电脑上的本地服务。

**必须部署到服务器吗？**

如果只是电脑预览，不需要。若要在 iPhone 上添加到主屏幕并稳定离线使用，推荐部署到 HTTPS 静态托管。

**数据会上传到云端吗？**

不会。当前版本没有后端，也不会主动上传持仓数据。导出 JSON 时，文件由你自己保存和管理。

**股票价格从哪里获取？**

新增持仓时会通过 Yahoo Finance 搜索股票并获取最新市场价格。保存后仍可在持仓详情中手动更新现价；当前版本不会在后台自动刷新全部持仓。

---

## English Version

This is an offline-first personal stock portfolio PWA. It does not require a backend. By default, all portfolio data is stored locally in the current browser.

### What You Can Do

- Search and validate symbols online, then fetch the latest price before adding a holding
- Add, edit, and delete holdings
- Tap a holding to open details, then add or reduce the position
- Each contract shows shares, latest price, cost, return rate, and portfolio weight
- View total market value, total cost, unrealized profit/loss, and return rate
- Track a USD cash position; purchases reduce cash, sales increase it, and negative cash is allowed
- Search holdings
- Sort by market value, profit/loss, or symbol
- Export a JSON backup
- Import data from a JSON backup
- Add it to your iPhone Home Screen
- Use it offline after the first successful load

### Important Notes

- Data is stored only on the current device and browser by default.
- Clearing Safari website data or removing the Home Screen app may delete local data.
- Export JSON backups regularly from the Data tab.
- iPhone Home Screen installation and Service Worker offline caching generally require HTTPS.
- `http://127.0.0.1:8000/` on your computer is only available to that computer. Your phone cannot use that address directly.

### Preview Locally on Your Computer

Run this command in the project folder:

```powershell
C:\Python314\python.exe -m http.server 8000 --bind 127.0.0.1
```

Then open this URL in your desktop browser:

```text
http://127.0.0.1:8000/
```

This is useful for development and preview, but it is not the recommended way to install the app on an iPhone.

### Use It on iPhone

1. Deploy this project to a static hosting service with HTTPS.

   Good options include GitHub Pages, Cloudflare Pages, Netlify, Vercel, or any HTTPS static file host.

2. Upload these files and folders:

```text
index.html
styles.css
app.js
sw.js
manifest.webmanifest
assets/
```

3. After deployment, copy the HTTPS URL, for example:

```text
https://your-site.example.com/
```

4. Open Safari on your iPhone.

5. Visit your HTTPS URL in Safari.

6. Wait for the page to fully load once.

7. Tap the Share button at the bottom of Safari.

8. Choose “Add to Home Screen”.

9. Confirm the name, such as “Portfolio”, then tap “Add”.

10. Go back to the iPhone Home Screen and open the new icon.

After installation, it runs in a standalone window and feels closer to a native app.

### Offline Usage

After the first successful HTTPS load, the browser caches the app files. You can then open it from the Home Screen without network access and continue viewing or editing your local holdings.

Recommended offline test:

1. Open the Home Screen app while online.
2. Add a test holding.
3. Close the app.
4. Turn on Airplane Mode.
5. Open the app from the Home Screen again.
6. Confirm that the page opens and your data is still there.

### Positions and Trades

Add your first position:

1. Open the app.
2. Tap the New tab.
3. Enter a symbol or company name (for example, `INTC`) and tap Search.
4. Confirm the matched security and latest price. An exact symbol is selected automatically.
5. Enter the quantity and purchase price.
6. Tap Save Holding.

The app validates that the security exists and records the currency reported by the market-data service. Search and current-price lookup require a network connection; saved holdings remain available offline.

Add or reduce a position:

1. Go back to the Positions tab.
2. Tap a holding row.
3. Choose Add or Reduce in the bottom detail sheet.
4. Enter trade quantity and trade price.
5. Tap confirm.

Adding shares recalculates the average cost using the purchase amount plus commission. Reducing shares uses net sale proceeds to reduce the remaining total cost: `(old total cost - sold shares × sale price + commission) ÷ remaining shares`. Trade prices and commissions are recorded in history, while the current price continues to come from the latest market quote.

### Backup and Restore

Backup:

1. Open the app.
2. Switch to the Data tab.
3. Tap “Export JSON”.
4. Save the downloaded JSON file to iCloud Drive, the Files app, or another safe location.

Restore:

1. Open the app.
2. Switch to the Data tab.
3. Tap “Import JSON”.
4. Choose a previously exported JSON file.

Importing replaces the current local holdings list. Export your current data before importing if needed.

### FAQ

**Why can’t my iPhone open `127.0.0.1`?**

`127.0.0.1` always points to the current device itself. On your computer, it points to your computer. On your iPhone, it points to the iPhone, so it cannot reach the local server running on your computer.

**Do I have to deploy it to a server?**

No, not for desktop preview. For iPhone Home Screen installation and reliable offline usage, HTTPS static hosting is recommended.

**Will my data be uploaded to the cloud?**

No. This version has no backend and does not upload your portfolio data. JSON exports are files that you manage yourself.

**Where do stock prices come from?**

When adding a holding, the app searches Yahoo Finance and retrieves the latest market price. You can still update the current price manually from the holding details. This version does not refresh every holding automatically in the background.
