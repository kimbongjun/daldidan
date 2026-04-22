#!/usr/bin/env python3
from __future__ import annotations

"""
동행복권 로또 당첨번호 크롤러
네이버 로또 위젯 HTML을 우선 크롤링하고, 필요 시 dhlottery JSON을 보조로 사용한다.
가져온 당첨번호를 Supabase lotto_results 테이블에 저장한다.

사용법:
  python lotto_crawler.py                  # 최신 1회차 크롤링
  python lotto_crawler.py --rounds 5       # 최신 5회차 크롤링
  python lotto_crawler.py --from-round 1   # 1회차부터 현재까지 전체 크롤링

필요 환경변수 (.env.local 또는 실행 환경):
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import os
import re
import sys
import time
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from supabase import create_client

# ── 상수 ──────────────────────────────────────────────────────────────────────
KST = timezone(timedelta(hours=9))
FIRST_DRAW = datetime(2002, 12, 7, 20, 45, tzinfo=KST)  # 1회 추첨: 2002-12-07 20:45 KST
WEEK_SECS = 7 * 24 * 3600

DHLOTTERY_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo={}"
NAVER_SEARCH_URL = "https://search.naver.com/search.naver?where=nexearch&query={}"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.dhlottery.co.kr/gameResult.do?method=byWin",
}
NAVER_HEADERS = {
    "User-Agent": HEADERS["User-Agent"],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": HEADERS["Accept-Language"],
    "Referer": "https://search.naver.com/",
}


# ── 유틸 ──────────────────────────────────────────────────────────────────────
def get_latest_round() -> int:
    elapsed = (datetime.now(KST) - FIRST_DRAW).total_seconds()
    if elapsed < 0:
        return 1
    return int(elapsed // WEEK_SECS) + 1


def _to_number(value: str) -> int:
    return int("".join(ch for ch in value if ch.isdigit()) or "0")


def fetch_round_from_naver(drw_no: int) -> dict | None:
    try:
        query = requests.utils.quote(f"{drw_no}회 로또 당첨번호")
        r = requests.get(
            NAVER_SEARCH_URL.format(query),
            headers=NAVER_HEADERS,
            timeout=10,
        )
        r.raise_for_status()
        text = r.text

        round_match = re.search(
            r'class="text _select_trigger _text"[^>]*>(\d+)회차 \((\d{4}\.\d{2}\.\d{2}\.)\)</a>',
            text,
        )
        if not round_match:
            return None

        actual_round = int(round_match.group(1))
        if actual_round != drw_no:
            return None

        winning_match = re.search(
            r'<div class="winning_number">([\s\S]*?)</div>\s*<div class="bonus_number">\s*<span class="ball [^"]+">(\d+)</span>',
            text,
        )
        if not winning_match:
            return None

        numbers = [int(n) for n in re.findall(r'<span class="ball [^"]+">(\d+)</span>', winning_match.group(1))]
        if len(numbers) != 6:
            return None

        first_prize_match = re.search(
            r'<th scope="row" rowspan="4">1등</th>\s*<td class="sub_title">총 당첨금</td>\s*<td>([\d,]+)원</td>\s*</tr>\s*<tr>\s*<td class="sub_title">당첨 복권수</td>\s*<td>([\d,]+)개</td>\s*</tr>\s*<tr class="emphasis">\s*<td class="sub_title">1개당 당첨금</td>\s*<td>([\d,]+)원</td>',
            text,
        )
        if not first_prize_match:
            return None

        return {
            "drwNo": actual_round,
            "drwNoDate": round_match.group(2).rstrip(".").replace(".", "-"),
            "drwtNo1": numbers[0],
            "drwtNo2": numbers[1],
            "drwtNo3": numbers[2],
            "drwtNo4": numbers[3],
            "drwtNo5": numbers[4],
            "drwtNo6": numbers[5],
            "bnusNo": int(winning_match.group(2)),
            "firstPrzwnerCo": _to_number(first_prize_match.group(2)),
            "firstWinamnt": _to_number(first_prize_match.group(3)),
            "firstAccumAmnt": _to_number(first_prize_match.group(1)),
        }
    except Exception as exc:
        print(f"    네이버 크롤링 오류: {exc}")
        return None


def fetch_round_from_dhlottery(drw_no: int) -> dict | None:
    try:
        r = requests.get(DHLOTTERY_URL.format(drw_no), headers=HEADERS, timeout=10)
        r.raise_for_status()
        data = r.json()
        if data.get("returnValue") != "success":
            return None
        return data
    except Exception as exc:
        print(f"    dhlottery 오류: {exc}")
        return None


def fetch_round(drw_no: int) -> dict | None:
    data = fetch_round_from_naver(drw_no)
    if data:
        return data
    return fetch_round_from_dhlottery(drw_no)


def to_row(data: dict) -> dict:
    return {
        "drw_no": data["drwNo"],
        "drw_no_date": data["drwNoDate"],
        "drw_no1": data["drwtNo1"],
        "drw_no2": data["drwtNo2"],
        "drw_no3": data["drwtNo3"],
        "drw_no4": data["drwtNo4"],
        "drw_no5": data["drwtNo5"],
        "drw_no6": data["drwtNo6"],
        "drw_no_bonus_no": data["bnusNo"],
        "first_win_cnt": data.get("firstPrzwnerCo", 0),
        "first_win_amnt": data.get("firstWinamnt"),
        "first_accum_prize_r": data.get("firstAccumAmnt", 0),
    }


# ── 메인 ──────────────────────────────────────────────────────────────────────
def main() -> None:
    # .env.local 자동 로드 (프로젝트 루트에서 실행 시)
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env.local"))

    parser = argparse.ArgumentParser(description="로또 당첨번호 크롤러")
    parser.add_argument("--rounds", type=int, default=1, metavar="N",
                        help="최신 N회차 크롤링 (기본: 1)")
    parser.add_argument("--from-round", type=int, metavar="N",
                        help="N회차부터 현재까지 전체 크롤링")
    args = parser.parse_args()

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        sys.exit("오류: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.")

    supabase = create_client(supabase_url, service_key)
    latest = get_latest_round()

    if args.from_round:
        targets = list(range(args.from_round, latest + 1))
    else:
        start = max(1, latest - args.rounds + 1)
        targets = list(range(start, latest + 1))

    print(f"크롤링 대상: {targets[0]}회 ~ {targets[-1]}회 ({len(targets)}건)")

    saved = 0
    for drw_no in targets:
        print(f"  [{drw_no:4d}회] ", end="", flush=True)
        data = fetch_round(drw_no)
        if data:
            supabase.table("lotto_results").upsert(
                to_row(data), on_conflict="drw_no"
            ).execute()
            print(f"저장 완료  {data['drwNoDate']}  "
                  f"{data['drwtNo1']}-{data['drwtNo2']}-{data['drwtNo3']}-"
                  f"{data['drwtNo4']}-{data['drwtNo5']}-{data['drwtNo6']}  "
                  f"보너스 {data['bnusNo']}")
            saved += 1
        else:
            print("데이터 없음 (추첨 전이거나 회차 오류)")
        time.sleep(0.4)  # 서버 부하 방지

    print(f"\n완료: {saved}/{len(targets)}건 저장")


if __name__ == "__main__":
    main()
