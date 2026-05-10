-- Americas를 NorthAmerica / SouthAmerica 로 분리
-- 국가명 기반으로 남미 국가는 SouthAmerica, 나머지는 NorthAmerica

UPDATE travel_locations
SET continent = 'SouthAmerica'
WHERE continent = 'Americas'
  AND country IN (
    '브라질', 'Brazil',
    '아르헨티나', 'Argentina',
    '페루', 'Peru',
    '칠레', 'Chile',
    '콜롬비아', 'Colombia',
    '에콰도르', 'Ecuador',
    '볼리비아', 'Bolivia',
    '베네수엘라', 'Venezuela',
    '파라과이', 'Paraguay',
    '우루과이', 'Uruguay',
    '가이아나', 'Guyana',
    '수리남', 'Suriname',
    '프랑스령 기아나', 'French Guiana'
  );

UPDATE travel_locations
SET continent = 'NorthAmerica'
WHERE continent = 'Americas';
