// Every query the dashboard can run is defined HERE, on the server.
// The frontend only asks for a metric by id; it never sends SQL.
//
// Fields:
//   id      unique id used in the URL (/api/metrics/:id)
//   page    page id from permissions.js - the caller's role must have access to that page
//   title   label shown on the dashboard
//   type    'kpi' | 'line' | 'bar' | 'table'
//   x, y    column names used for line/bar charts (y may be an array for multiple series)
//   yLabel  optional friendly name for the value shown in tooltips
//   layout  optional 'horizontal' for bar charts with long category labels
//   wide    optional true to span the full dashboard width
//   params  optional list of allowed query params (see PARAMS in routes.js):
//           'from', 'to' (dates → @from/@to), 'year' (→ @yearStart/@yearEnd),
//           'rankBy' ('qty' | 'revenue' → @rankBy), 'top' (1–10 → @top), 'category' (→ @category),
//           'date' (one day → @date, NULL = today in Sri Lanka), 'shop' ('all' | branch code → @shop)
//   hidden  optional true for helper queries the dashboard doesn't render as a card
//   sql     T-SQL. KPI queries return one row with a `value` column.
//
// Note on dbo.Invoice: each row is one invoice line, but `iamount`/`Subtotal`/`grandtot`
// hold the WHOLE invoice total repeated on every line. Line revenue is
// iquan * icost - itemdiscount (icost is the unit selling price).

// One row per invoice line in the chosen year, with a clean item name, category and line revenue.
const invoiceLinesForYear = `
  lines AS (
    SELECT RTRIM(i.iitcode) AS itemCode,
           RTRIM(COALESCE(s.itname, i.iitdes)) AS itemName,
           RTRIM(COALESCE(s.cdes, i.item_category_des, 'Uncategorised')) AS category,
           i.ino,
           i.idate,
           i.iquan AS qty,
           i.iquan * i.icost - ISNULL(i.itemdiscount, 0) AS revenue,
           i.costprice
    FROM dbo.Invoice i
    LEFT JOIN dbo.Stock s ON RTRIM(s.itcode) = RTRIM(i.iitcode)
    WHERE i.idate >= @yearStart AND i.idate < @yearEnd
      AND (@month = 0 OR MONTH(i.idate) = @month)
  )`;

export const metrics = [
  {
    id: 'invoice-years',
    page: 'dashboard',
    title: 'Years with sales',
    type: 'options',
    hidden: true,
    sql: `SELECT DISTINCT YEAR(idate) AS year FROM dbo.Invoice WHERE idate IS NOT NULL ORDER BY year DESC`,
  },
  {
    id: 'best-sellers-by-category',
    page: 'dashboard',
    title: 'Best-selling items by category',
    type: 'category-leaders',
    wide: true,
    params: ['year', 'month', 'rankBy', 'top'],
    sql: `
      WITH ${invoiceLinesForYear},
      items AS (
        SELECT category, itemCode, MAX(itemName) AS itemName,
               SUM(qty) AS qty, SUM(revenue) AS revenue, COUNT(DISTINCT ino) AS invoices
        FROM lines
        GROUP BY category, itemCode
      ),
      ranked AS (
        SELECT items.*,
               SUM(qty) OVER (PARTITION BY category) AS categoryQty,
               SUM(revenue) OVER (PARTITION BY category) AS categoryRevenue,
               COUNT(*) OVER (PARTITION BY category) AS categoryItems,
               ROW_NUMBER() OVER (
                 PARTITION BY category
                 ORDER BY CASE WHEN @rankBy = 'revenue' THEN revenue ELSE qty END DESC,
                          CASE WHEN @rankBy = 'revenue' THEN qty ELSE revenue END DESC,
                          itemCode
               ) AS [rank]
        FROM items
      )
      SELECT category, [rank], itemCode, itemName, qty, revenue, invoices,
             categoryQty, categoryRevenue, categoryItems
      FROM ranked
      WHERE [rank] <= @top
      ORDER BY categoryRevenue DESC, category, [rank]`,
  },
  {
    // Every product in one category for a year, including catalogue items with no sales.
    id: 'category-products',
    page: 'dashboard',
    title: 'Products in category',
    type: 'table',
    hidden: true,
    params: ['year', 'month', 'category'],
    sql: `
      WITH ${invoiceLinesForYear},
      sold AS (
        SELECT itemCode, MAX(itemName) AS itemName, SUM(qty) AS qty, SUM(revenue) AS revenue,
               COUNT(DISTINCT ino) AS invoices, MAX(idate) AS lastSold,
               -- Weighted average cost at time of sale; lines recorded with zero cost are ignored.
               SUM(CASE WHEN costprice > 0 THEN qty * costprice END)
                 / NULLIF(SUM(CASE WHEN costprice > 0 THEN qty END), 0) AS costPerUnit
        FROM lines
        WHERE category = @category
        GROUP BY itemCode
      ),
      catalogue AS (
        SELECT RTRIM(itcode) AS itemCode, RTRIM(itname) AS itemName, cprice
        FROM dbo.Stock
        WHERE RTRIM(cdes) = @category
      )
      SELECT COALESCE(s.itemCode, c.itemCode) AS itemCode,
             COALESCE(s.itemName, c.itemName) AS itemName,
             ISNULL(s.qty, 0) AS qty,
             ISNULL(s.revenue, 0) AS revenue,
             ISNULL(s.invoices, 0) AS invoices,
             s.lastSold,
             COALESCE(s.costPerUnit, c.cprice) AS costPerUnit,
             CASE WHEN s.costPerUnit IS NOT NULL THEN 'sales' WHEN c.cprice IS NOT NULL THEN 'current' END AS costSource
      FROM sold s
      FULL OUTER JOIN catalogue c ON c.itemCode = s.itemCode
      ORDER BY qty DESC, revenue DESC, itemName`,
  },
  {
    // Every invoice line for one day, optionally for one shop. The page aggregates it.
    // The DB server runs on US time, so "today" is SYSDATETIMEOFFSET shifted to Sri Lanka (+05:30).
    // Invoice.sale_DateTime is stored in 12-hour form WITHOUT AM/PM (5:11 PM is saved as 05:11),
    // so the real time comes from System_Log (24-hour). If no log entry exists, hours 1–9 are
    // treated as PM, since the shops trade roughly 10:00–22:00.
    id: 'daily-sales-lines',
    page: 'today',
    title: 'Sales for a day',
    type: 'table',
    hidden: true,
    params: ['date', 'shop'],
    sql: `
      DECLARE @day date = COALESCE(@date, CAST(SWITCHOFFSET(SYSDATETIMEOFFSET(), '+05:30') AS date));
      SELECT CONVERT(varchar(10), @day, 23) AS saleDate,
             RTRIM(i.ino) AS invoiceNo,
             RTRIM(i.branch) AS shop,
             CONVERT(varchar(5), COALESCE(
               l.loggedAt,
               CASE WHEN DATEPART(hour, i.sale_DateTime) BETWEEN 1 AND 9
                    THEN DATEADD(hour, 12, i.sale_DateTime) ELSE i.sale_DateTime END
             ), 108) AS time,
             RTRIM(i.staff) AS staff,
             RTRIM(i.cusdes) AS customer,
             RTRIM(i.methoed) AS payment,
             RTRIM(i.iitcode) AS itemCode,
             RTRIM(COALESCE(s.itname, i.iitdes)) AS itemName,
             RTRIM(COALESCE(s.cdes, i.item_category_des, 'Uncategorised')) AS category,
             i.iquan AS qty,
             i.icost AS unitPrice,
             i.iquan * i.icost - ISNULL(i.itemdiscount, 0) AS revenue,
             -- Cost at the time of sale. A few lines are recorded with 0; they stay NULL so the
             -- page can leave them out of profit rather than counting them as pure margin.
             i.iquan * NULLIF(i.costprice, 0) AS cost
      FROM dbo.Invoice i
      LEFT JOIN dbo.Stock s ON RTRIM(s.itcode) = RTRIM(i.iitcode)
      LEFT JOIN (
        SELECT RTRIM(log_tran_no) AS invoiceNo, MIN(log_dateTime) AS loggedAt
        FROM dbo.System_Log
        WHERE log_tran_type = 'Invoice' AND log_tran_date = @day
        GROUP BY RTRIM(log_tran_no)
      ) l ON l.invoiceNo = RTRIM(i.ino)
      WHERE i.idate >= @day AND i.idate < DATEADD(day, 1, @day)
        AND (@shop = 'all' OR i.branch = @shop)
      ORDER BY time DESC, invoiceNo, i.row_ID`,
  },
  {
    // Item master with every price the POS keeps. 96 rows, so the page filters and sorts it.
    // cprice is the current cost and uprice the retail price: both were checked against
    // Invoice.costprice / Invoice.icost on real sales lines and matched.
    id: 'item-prices',
    page: 'items',
    title: 'Items and prices',
    type: 'table',
    hidden: true,
    sql: `
      SELECT RTRIM(s.itcode) AS itemCode,
             RTRIM(s.itname) AS itemName,
             COALESCE(NULLIF(RTRIM(s.cdes), ''), 'Uncategorised') AS category,
             s.cprice AS cost,
             s.uprice AS retail,
             s.wprice AS wholesale,
             CASE WHEN s.uprice > 0 THEN (s.uprice - s.cprice) / s.uprice END AS margin,
             ISNULL(s.HCM, 0) + ISNULL(s.One_Galle_Face, 0)
               + ISNULL(s.Hill_Street, 0) + ISNULL(s.Gym_Store, 0) AS stock
      FROM dbo.Stock s
      ORDER BY category, itemName`,
  },
  {
    // Stock per location, one row per item per location.
    // dbo.Stock keeps a separate quantity column for each location, so the location list is
    // read from dbo.Loca and matched against the real columns of dbo.Stock — nothing is
    // hard-coded, and a location added to the POS shows up here on its own. The column
    // names come from sys.columns (never from a request) and go through QUOTENAME.
    // These are the POS running balances and they reconcile with the Bin_Card ledger.
    id: 'stock-by-location',
    page: 'stock',
    title: 'Stock by location',
    type: 'table',
    hidden: true,
    sql: `
      DECLARE @cols nvarchar(max), @sql nvarchar(max);

      -- FOR XML PATH rather than STRING_AGG: the database runs at an older compatibility level.
      SELECT @cols = STUFF((
               SELECT ', (N''' + REPLACE(c.name, '''', '''''') + ''', ISNULL(s.' + QUOTENAME(c.name) + ', 0))'
               FROM sys.columns c
               WHERE c.object_id = OBJECT_ID('dbo.Stock')
                 AND EXISTS (SELECT 1 FROM dbo.Loca l WHERE RTRIM(l.LocaName) = c.name)
               ORDER BY c.name
               FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 2, '');

      IF @cols IS NULL
        SELECT TOP 0 CAST(NULL AS varchar(40)) AS itemCode, CAST(NULL AS varchar(200)) AS itemName,
                     CAST(NULL AS varchar(100)) AS category, CAST(NULL AS float) AS cost,
                     CAST(NULL AS nvarchar(128)) AS location, CAST(NULL AS float) AS qty;
      ELSE
      BEGIN
        SET @sql = N'
          SELECT RTRIM(s.itcode) AS itemCode,
                 RTRIM(s.itname) AS itemName,
                 COALESCE(NULLIF(RTRIM(s.cdes), ''''), ''Uncategorised'') AS category,
                 s.cprice AS cost,
                 v.location,
                 v.qty
          FROM dbo.Stock s
          CROSS APPLY (VALUES ' + @cols + N') AS v(location, qty)
          ORDER BY itemName, v.location';
        EXEC sp_executesql @sql;
      END`,
  },

  // Example of a date-filtered metric — adapt once the real schema is known:
  // {
  //   id: 'signups-per-day',
  //   title: 'New members per day',
  //   type: 'line',
  //   x: 'day',
  //   y: 'members',
  //   params: ['from', 'to'],
  //   sql: `SELECT CAST(CreatedAt AS date) AS day, COUNT(*) AS members
  //         FROM dbo.Members
  //         WHERE (@from IS NULL OR CreatedAt >= @from)
  //           AND (@to   IS NULL OR CreatedAt <  DATEADD(day, 1, @to))
  //         GROUP BY CAST(CreatedAt AS date)
  //         ORDER BY day`,
  // },
];
