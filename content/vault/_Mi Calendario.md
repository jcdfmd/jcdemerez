---
created: 2026-04-19T18:20
updated: 2026-04-23T16:41
---
```dataview
TABLE type AS "Tipo", publish_day AS "Día de Emisión", publish_time AS "Hora"
WHERE publish_day != null
SORT choice((number(split(publish_day, "-")[1]) * 100 + number(split(publish_day, "-")[0])) >= (date(today).month * 100 + date(today).day), (number(split(publish_day, "-")[1]) * 100 + number(split(publish_day, "-")[0])), (number(split(publish_day, "-")[1]) * 100 + number(split(publish_day, "-")[0])) + 10000) ASC, publish_time ASC
```
