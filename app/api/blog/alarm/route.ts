import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/blog/alarm
 * 블로그 글 발행/수정 후 카카오 알림톡 발송 요청을 처리합니다.
 *
 * 환경 변수:
 *   KAKAO_ALIMTALK_API_KEY  — 카카오 비즈니스 API 키
 *   KAKAO_ALIMTALK_SENDER   — 등록된 발신번호
 *   KAKAO_ALIMTALK_TEMPLATE — 승인된 템플릿 코드
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json() as {
    phone?: string;
    title?: string;
    slug?: string;
    type?: "publish" | "update";
  };

  const phone = body.phone?.replace(/[^0-9]/g, "");
  const title = body.title?.trim() ?? "";
  const slug = body.slug?.trim() ?? "";
  const type = body.type ?? "publish";

  if (!phone || phone.length < 10) {
    return NextResponse.json({ error: "올바른 수신 번호를 입력해주세요." }, { status: 400 });
  }

  if (!title || !slug) {
    return NextResponse.json({ error: "글 정보가 부족합니다." }, { status: 400 });
  }

  const apiKey = process.env.KAKAO_ALIMTALK_API_KEY;
  const sender = process.env.KAKAO_ALIMTALK_SENDER;
  const templateCode = process.env.KAKAO_ALIMTALK_TEMPLATE;

  if (!apiKey || !sender || !templateCode) {
    // API 키가 미설정인 경우 성공으로 응답하되 실제 발송은 하지 않음
    return NextResponse.json({
      ok: true,
      sent: false,
      reason: "카카오 알림톡 API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.",
    });
  }

  const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/blog/${encodeURIComponent(slug)}`;
  const message =
    type === "publish"
      ? `[달디단] 새 글이 발행되었어요!\n\n제목: ${title}\n\n바로 읽기: ${postUrl}`
      : `[달디단] 글이 수정되었어요!\n\n제목: ${title}\n\n바로 읽기: ${postUrl}`;

  try {
    // 카카오 비즈니스 API 알림톡 발송 (솔루션 제공사 API 연동 예시)
    const resp = await fetch("https://api-alimtalk.kakao.com/alimtalk/v2.2/senders/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `KakaoAK ${apiKey}`,
      },
      body: JSON.stringify({
        senderKey: sender,
        templateCode,
        recipientList: [
          {
            recipientNo: phone,
            templateParameter: {
              title,
              url: postUrl,
            },
          },
        ],
        content: message,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      return NextResponse.json({ ok: false, error: errBody }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sent: true });
  } catch {
    return NextResponse.json({ ok: false, error: "알림톡 발송 중 오류가 발생했습니다." }, { status: 500 });
  }
}
