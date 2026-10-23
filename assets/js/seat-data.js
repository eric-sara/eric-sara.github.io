/* =========================================================
   座位查詢資料 ─ 只要改這個檔案
   ---------------------------------------------------------
   guests：每位賓客一行
     name    姓名（查詢比對用）
     table   桌號（要跟下面 tables 的 no 對得上）
     seats   幫他保留幾個位子（含攜伴、小孩），預設 1
     note    同名時用來區分，會顯示在選單上（例：新郎同事）
     aliases 其他叫法（小名、英文名），輸入這些也查得到
   ---------------------------------------------------------
   ⚠ 以下名單全部是假資料，名單定稿後整段換掉
   ========================================================= */
window.SEAT_DATA = {

  openAt: "2026-12-05T12:00:00+08:00",   // 這個時間以前只顯示倒數；網址加 ?preview=1 可提前看
  showTablemates: true,   // 桌面上要不要顯示同桌的人名
  freeSeating: true,      // true = 同桌自由入座（畫面會註明桌卡只是示意）

  guests: [
    { name: "等雨停", table: 5,  seats: 1 },
    { name: "溫爸爸", table: 5,  seats: 2 },
    { name: "溫媽媽", table: 5,  seats: 1 },
    { name: "溫小弟", table: 5,  seats: 1, aliases: ["小弟"] },
    { name: "邱雅雯", table: 5,  seats: 2 },
    { name: "林家豪", table: 3,  seats: 2 },
    { name: "陳怡君", table: 7,  seats: 1, note: "新娘大學同學" },
    { name: "陳怡君", table: 12, seats: 1, note: "新郎同事" },
    { name: "王小明", table: 2,  seats: 3, aliases: ["小明", "Ming"] },
    { name: "王小美", table: 2,  seats: 1 },
    { name: "張雅婷", table: 8,  seats: 2 },
    { name: "李承翰", table: 10, seats: 1 },
    { name: "黃思涵", table: 14, seats: 1 },
    { name: "吳建宏", table: 16, seats: 4 },
    { name: "周佳穎", table: 11, seats: 1 },
    { name: "許志明", table: 1,  seats: 2 },
    { name: "鄭雅文", table: 6,  seats: 1 },
    { name: "蔡宗翰", table: 9,  seats: 2 },
    { name: "謝佩珊", table: 13, seats: 1 },
    { name: "郭俊傑", table: 15, seats: 1 },
    { name: "楊淑芬", table: 4,  seats: 2 }
  ],

  /* ---------------------------------------------------------
     會場平面圖（試做：16 桌、L 型走道）
     畫布 360 × 460。x 往右、y 往下；舞台在上，入口在左下
     有飯店正式平面圖後，改這裡的座標和桌號就好
     --------------------------------------------------------- */
  plan: {
    stage:  { x: 110, y: 22, w: 140, h: 38, label: "舞 台" },
    aisleX: 180,          // 直走道中心線
    aisleW: 24,
    corridorY: 418,       // 入口橫走道中心線
    door:   { x: 12, y: 418, label: "入口" },
    tableR: 24,
    seatsPerTable: 10,
    tables: [
      { no: 1,  x: 122, y: 112, label: "主桌" },
      { no: 2,  x: 238, y: 112 },
      { no: 3,  x: 62,  y: 112 },
      { no: 4,  x: 298, y: 112 },
      { no: 5,  x: 122, y: 186 },
      { no: 6,  x: 238, y: 186 },
      { no: 7,  x: 62,  y: 186 },
      { no: 8,  x: 298, y: 186 },
      { no: 9,  x: 122, y: 260 },
      { no: 10, x: 238, y: 260 },
      { no: 11, x: 62,  y: 260 },
      { no: 12, x: 298, y: 260 },
      { no: 13, x: 122, y: 334 },
      { no: 14, x: 238, y: 334 },
      { no: 15, x: 62,  y: 334 },
      { no: 16, x: 298, y: 334 }
    ]
  }
};
