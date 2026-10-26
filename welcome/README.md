# MRJ `/welcome` — 학부모 마케팅 스켈레톤

GitHub Pages 경로: `https://mrjkorea.github.io/welcome/`

학부모 QR용 단일 페이지입니다. 루트의 Study World SPA(`index.html`, `app.js` 등)와 분리되어 있으며, 이 폴더만 수정하면 됩니다.

## 파일

| 파일 | 역할 |
|------|------|
| `index.html` | 섹션·마크업 |
| `styles.css` | 모바일 우선 스타일 |
| `app.js` | 프로그램 모달, FAQ 챗, YouTube lite, 폼 |
| `config.js` | **Jay가 채울 URL·미디어** |
| `faq.json` | FAQ 챗·아코디언 답변 뱅크 (고정, LLM 없음) |

## config.js — Jay가 나중에 채울 항목

- `social.kakao`, `social.instagram`, `social.naverBlog` — 현재 `null` → 버튼은 “링크 준비 중”
- `media.heroPoster`, `media.heroVideoUrl`, `media.teacherVideoUrl`
- `media.youtubeFeaturedId` — YouTube lite 탭 시 embed (없으면 채널로 이동)
- `programs.<id>.clipUrl` — 각 프로그램 모달 15초 클립 등

검증된 링크는 이미 설정됨: X, YouTube, 뉴스레터, 전화 `010-6616-2125`.

## FAQ 챗

`faq.json` 키워드 매칭만 사용합니다. 모르는 질문 → 선생님 연락 안내 (수업료 등 임의 생성 없음).

## 로컬 미리보기

```bash
cd welcome && python3 -m http.server 8765
```

브라우저: `http://localhost:8765/`
