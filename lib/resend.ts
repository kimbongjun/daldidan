import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/server";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "달디단 <noreply@daldidan.com>";

/**
 * Resend가 거부하는 도메인 목록.
 * example.com 등 RFC 2606 예약 도메인과 일반적인 테스트 도메인을 포함합니다.
 * 배치 내 하나라도 포함되면 배치 전체가 실패하므로 사전 필터링이 필수입니다.
 */
const BLOCKED_DOMAINS = new Set([
  "example.com",
  "example.net",
  "example.org",
  "test.com",
  "test.net",
  "test.org",
  "localhost",
  "invalid",
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "sharklasers.com",
  "guerrillamailblock.com",
  "trashmail.com",
  "yopmail.com",
]);

function isDeliverableEmail(email: string): boolean {
  const atIdx = email.lastIndexOf("@");
  if (atIdx < 1) return false;
  const domain = email.slice(atIdx + 1).toLowerCase().trim();
  if (!domain || domain.indexOf(".") === -1) return false;
  return !BLOCKED_DOMAINS.has(domain);
}

/** 가입 유저 이메일 목록을 Supabase Admin API로 조회합니다. */
async function getRegisteredEmails(): Promise<string[]> {
  const admin = createAdminClient();

  const emails: string[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error || !data) break;

    for (const u of data.users) {
      if (u.email && isDeliverableEmail(u.email)) {
        emails.push(u.email);
      }
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return emails;
}

/** 블로그 신규 발행 시 전체 가입 유저에게 이메일을 발송합니다. */
export async function sendBlogPublishNotification(params: {
  title: string;
  description: string;
  slug: string;
  authorName: string;
  thumbnailUrl?: string | null;
}): Promise<{ sent: number; failed: number; skipped: number }> {
  if (!process.env.RESEND_API_KEY) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const { title, description, slug, authorName, thumbnailUrl } = params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const postUrl = `${siteUrl}/blog/${encodeURIComponent(slug)}`;

  const allEmails = await getRegisteredEmails();
  if (allEmails.length === 0) return { sent: 0, failed: 0, skipped: 0 };

  const html = buildEmailHtml({ title, description, postUrl, authorName, thumbnailUrl });
  const text = buildEmailText({ title, description, postUrl, authorName });

  let sent = 0;
  let failed = 0;
  // getRegisteredEmails에서 이미 필터링하므로 skipped는 0 (향후 확장 여지)
  const skipped = 0;

  // Resend 배치 한도: 최대 100개/요청 — 100개씩 묶어 발송
  const BATCH_SIZE = 100;
  for (let i = 0; i < allEmails.length; i += BATCH_SIZE) {
    const batch = allEmails.slice(i, i + BATCH_SIZE);
    const messages = batch.map((to) => ({
      from: FROM_EMAIL,
      to,
      subject: `[달디단] 새 글이 발행되었습니다: ${title}`,
      html,
      text,
    }));

    try {
      const { data, error } = await getResend().batch.send(messages);

      if (error) {
        console.error("[resend] 배치 발송 오류:", error);
        failed += batch.length;
        continue;
      }

      // 개별 메시지 결과 확인 (data.data 배열 — id 없으면 해당 주소 발송 실패)
      if (data?.data) {
        for (const result of data.data) {
          if (result?.id) {
            sent++;
          } else {
            failed++;
          }
        }
      } else {
        // data가 없으면 전체 실패로 처리
        failed += batch.length;
      }
    } catch (err) {
      console.error("[resend] 배치 발송 예외:", err);
      failed += batch.length;
    }
  }

  return { sent, failed, skipped };
}

function buildEmailHtml(params: {
  title: string;
  description: string;
  postUrl: string;
  authorName: string;
  thumbnailUrl?: string | null;
}): string {
  const { title, description, postUrl, authorName, thumbnailUrl } = params;
  const thumbBlock = thumbnailUrl
    ? `<img src="${thumbnailUrl}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:8px;margin-bottom:20px;" />`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#0F0F14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F0F14;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#16161F;border-radius:16px;border:1px solid #2A2A3A;overflow:hidden;max-width:600px;width:100%;">
        <!-- 헤더 -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366F1,#7C3AED);padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#F1F1F5;letter-spacing:-0.5px;">달디단</p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(241,241,245,0.7);">새 글이 발행되었어요</p>
          </td>
        </tr>
        <!-- 본문 -->
        <tr>
          <td style="padding:32px;">
            ${thumbBlock}
            <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#6366F1;text-transform:uppercase;letter-spacing:1px;">NEW POST</p>
            <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#F1F1F5;line-height:1.35;">${escapeHtml(title)}</h1>
            <p style="margin:0 0 8px;font-size:13px;color:#8B8BA7;">by ${escapeHtml(authorName)}</p>
            <p style="margin:0 0 28px;font-size:15px;color:#C4C4D4;line-height:1.7;">${escapeHtml(description)}</p>
            <a href="${postUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366F1,#7C3AED);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;">글 읽기 →</a>
          </td>
        </tr>
        <!-- 푸터 -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2A2A3A;">
            <p style="margin:0;font-size:12px;color:#8B8BA7;line-height:1.6;">
              이 메일은 달디단 가입 계정으로 발송되었습니다.<br />
              <a href="${postUrl}" style="color:#6366F1;text-decoration:none;">글 바로가기</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildEmailText(params: {
  title: string;
  description: string;
  postUrl: string;
  authorName: string;
}): string {
  const { title, description, postUrl, authorName } = params;
  return [
    "[달디단] 새 글이 발행되었어요",
    "",
    `제목: ${title}`,
    `작성자: ${authorName}`,
    "",
    description,
    "",
    `바로 읽기: ${postUrl}`,
    "",
    "---",
    "이 메일은 달디단 가입 계정으로 발송되었습니다.",
  ].join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
