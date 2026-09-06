"""
support@clubseason.kr 로 메일을 보내는 운영 도구.

설정은 저장소 밖 %USERPROFILE%\\.clubseason\\mail.env 에서 읽는다(깃에 없음):

    SMTP_HOST=smtps.hiworks.com
    SMTP_PORT=465
    SMTP_USER=support@clubseason.kr
    SMTP_PASS=<하이웍스 메일 전용 비밀번호>
    FROM_NAME=Club Season 운영팀

사용:
    python tools/mail/send.py --to someone@example.com --subject "제목" --body body.txt
    python tools/mail/send.py --to a@x.com --subject "제목" --text "본문 한 줄"
    python tools/mail/send.py --test           # 자기 자신에게 시험 발송

--body 는 UTF-8 텍스트 파일 경로. 본문은 텍스트로 보내고 HTML 은 쓰지 않는다.
"""
from __future__ import annotations

import argparse
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path

ENV_PATH = Path.home() / ".clubseason" / "mail.env"


def load_env(path: Path) -> dict[str, str]:
    if not path.exists():
        sys.exit(f"설정 파일이 없습니다: {path}\n위 docstring 형식으로 만들어 주세요.")
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    missing = [k for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS") if not values.get(k)]
    if missing:
        sys.exit(f"{path} 에 값이 비어 있습니다: {', '.join(missing)}")
    return values


def send(env: dict[str, str], to: list[str], subject: str, body: str, cc: list[str] | None = None) -> None:
    msg = EmailMessage()
    msg["From"] = formataddr((env.get("FROM_NAME", "Club Season"), env["SMTP_USER"]))
    msg["To"] = ", ".join(to)
    if cc:
        msg["Cc"] = ", ".join(cc)
    msg["Subject"] = subject
    msg.set_content(body)
    port = int(env["SMTP_PORT"])
    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(env["SMTP_HOST"], port, context=context, timeout=30) as smtp:
            smtp.login(env["SMTP_USER"], env["SMTP_PASS"])
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(env["SMTP_HOST"], port, timeout=30) as smtp:
            smtp.starttls(context=context)
            smtp.login(env["SMTP_USER"], env["SMTP_PASS"])
            smtp.send_message(msg)


def main() -> None:
    parser = argparse.ArgumentParser(description="support@clubseason.kr 발송")
    parser.add_argument("--to", action="append", default=[], help="받는 사람 (여러 번 지정 가능)")
    parser.add_argument("--cc", action="append", default=[])
    parser.add_argument("--subject", default="")
    parser.add_argument("--body", help="본문 파일(UTF-8)")
    parser.add_argument("--text", help="본문 문자열")
    parser.add_argument("--test", action="store_true", help="자기 자신에게 시험 발송")
    args = parser.parse_args()

    env = load_env(ENV_PATH)
    if args.test:
        send(env, [env["SMTP_USER"]], "[Club Season] 발송 테스트", "이 메일이 보이면 SMTP 연동이 정상입니다.")
        print(f"시험 메일을 {env['SMTP_USER']} 로 보냈습니다.")
        return
    if not args.to or not args.subject or not (args.body or args.text):
        parser.error("--to, --subject, --body 또는 --text 가 필요합니다")
    body = Path(args.body).read_text(encoding="utf-8") if args.body else args.text
    send(env, args.to, args.subject, body or "", args.cc)
    print(f"보냈습니다 → {', '.join(args.to)}")


if __name__ == "__main__":
    main()
