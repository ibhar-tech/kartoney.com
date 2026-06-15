<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>خريطة موقع كارتوني (Sitemap)</title>
        <style>
          :root{--bg:#0e0e0e;--card:#1a1a1a;--line:#2a2a2a;--text:#eee;--muted:#9a9a9a;--primary:#f5a623}
          *{box-sizing:border-box}
          body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,'Segoe UI',Tahoma,sans-serif;padding:24px}
          h1{font-size:1.4rem;margin:0 0 4px}
          .sub{color:var(--muted);font-size:.9rem;margin-bottom:20px}
          .count{display:inline-block;background:var(--primary);color:#000;font-weight:700;border-radius:999px;padding:2px 12px;font-size:.85rem}
          table{width:100%;border-collapse:collapse;background:var(--card);border-radius:10px;overflow:hidden}
          th,td{text-align:right;padding:10px 14px;border-bottom:1px solid var(--line);font-size:.9rem}
          th{background:#161616;color:var(--muted);font-weight:600}
          tr:last-child td{border-bottom:none}
          a{color:var(--primary);text-decoration:none;word-break:break-all}
          a:hover{text-decoration:underline}
          td.n{color:var(--muted);width:48px}
          td.m{color:var(--muted);white-space:nowrap;width:120px}
        </style>
      </head>
      <body>
        <h1>خريطة موقع كارتوني</h1>
        <xsl:apply-templates/>
      </body>
    </html>
  </xsl:template>

  <!-- Sitemap index: list of child sitemaps -->
  <xsl:template match="s:sitemapindex">
    <p class="sub">فهرس خرائط الموقع — يحتوي على
      <span class="count"><xsl:value-of select="count(s:sitemap)"/></span>
      خريطة فرعية. تتبع كل رابط لعرض عناوين الصفحات.</p>
    <table>
      <tr><th class="n">#</th><th>خريطة الموقع الفرعية</th><th class="m">آخر تحديث</th></tr>
      <xsl:for-each select="s:sitemap">
        <tr>
          <td class="n"><xsl:value-of select="position()"/></td>
          <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
          <td class="m"><xsl:value-of select="s:lastmod"/></td>
        </tr>
      </xsl:for-each>
    </table>
  </xsl:template>

  <!-- URL set: list of page URLs -->
  <xsl:template match="s:urlset">
    <p class="sub">عدد العناوين:
      <span class="count"><xsl:value-of select="count(s:url)"/></span></p>
    <table>
      <tr><th class="n">#</th><th>العنوان (URL)</th><th class="m">آخر تحديث</th></tr>
      <xsl:for-each select="s:url">
        <tr>
          <td class="n"><xsl:value-of select="position()"/></td>
          <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
          <td class="m"><xsl:value-of select="s:lastmod"/></td>
        </tr>
      </xsl:for-each>
    </table>
  </xsl:template>
</xsl:stylesheet>
