(function () {
  const C = window.MRJ_WELCOME_CONFIG || {};
  const phoneTel = C.phoneTel || "tel:+821066162125";

  const PROGRAMS = [
    {
      id: "conversation",
      title: "대화 Conversation",
      benefit: "노래·발음·테스트·말하기가 이어지는 주간 스토리",
      forWho: "말하기 자신감을 키우고 싶은 아이",
      weekly: "월–금 앱 활동 + Day5 테스트 + Day6 대화",
      detail:
        "주간 스토리로 노래와 발음 연습이 이어지고, 테스트 후 말하기로 마무리합니다. 파닉스 전용 Day는 별도 Decodable/Phonics 프로그램에서 다룹니다.",
    },
    {
      id: "vocabulary",
      title: "어휘 Word Master",
      benefit: "체계적인 단어 학습과 반복",
      forWho: "어휘 기초·확장이 필요한 아이",
      weekly: "매일 단어 세트 + 주간 정답률 리포트",
      detail: "Word Master 등으로 단어를 쌓고, 다른 프로그램과 연결해 씁니다.",
    },
    {
      id: "grammar",
      title: "Grammar",
      benefit: "단계적 문법 + 실제 문장 적용",
      forWho: "문법을 말하기·쓰기와 연결하고 싶은 아이",
      weekly: "Grammar 레슨 + 연습",
      detail: "UI·안내 라벨은 Grammar입니다. 대화·리딩과 함께 씁니다.",
    },
    {
      id: "decodable",
      title: "Decodable / Phonics",
      benefit: "글자·소리 연결과 디코더블 리딩",
      forWho: "읽기 기초·파닉스가 필요한 아이",
      weekly: "레터 맵·디코더블 읽기 활동",
      detail: "더 많은 파닉스 프로그램 추가 예정입니다. (추가 파닉스 준비 중)",
    },
    {
      id: "reading",
      title: "Reading",
      benefit: "수준 맞춤 읽기·이해 활동",
      forWho: "독해·읽기 속도를 키우고 싶은 아이",
      weekly: "리딩 과제 + 이해 확인",
      detail: "Lexile/AR 등 외부 브랜드 레벨 표기는 사용하지 않습니다.",
    },
    {
      id: "typing",
      title: "Typing",
      benefit: "영어 입력·철자·속도",
      forWho: "숙제·에세이 효율을 높이고 싶은 아이",
      weekly: "타이핑 연습 루틴",
      detail: "키보드 익숙함이 영어 쓰기 전반에 도움이 됩니다.",
    },
    {
      id: "news",
      title: "News",
      benefit: "매일 뉴스 + 퀴즈",
      forWho: "세계 이해·읽기·어휘를 넓히고 싶은 아이",
      weekly: "일일 뉴스 기사와 퀴즈",
      detail: "뉴스 읽기로 어휘와 배경지식을 키웁니다.",
    },
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function showToast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.setAttribute("role", "status");
    Object.assign(t.style, {
      position: "fixed",
      top: "72px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "#142418",
      color: "#fff",
      padding: "0.65rem 1rem",
      borderRadius: "12px",
      zIndex: "400",
      fontSize: "0.88rem",
      maxWidth: "90%",
      textAlign: "center",
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  function openSocial(key) {
    const url = C.social && C.social[key];
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    showToast("링크 준비 중입니다. 전화로 문의해 주세요.");
  }

  function bindKakaoButtons() {
    document.querySelectorAll("[data-kakao]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openSocial("kakao");
      });
    });
  }

  function renderPrograms() {
    const grid = $("#program-grid");
    if (!grid) return;
    grid.innerHTML = "";
    PROGRAMS.forEach((p) => {
      const cfg = (C.programs && C.programs[p.id]) || {};
      const poster = cfg.poster || "../img/rocket.webp";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "program-card";
      btn.dataset.program = p.id;
      btn.innerHTML =
        '<div class="thumb"><img src="' +
        poster +
        '" alt="" loading="lazy"></div><div class="body"><h3>' +
        p.title +
        "</h3><p>" +
        p.benefit +
        "</p></div>";
      btn.addEventListener("click", () => openProgramModal(p));
      grid.appendChild(btn);
    });
  }

  function openProgramModal(p) {
    const backdrop = $("#program-modal");
    if (!backdrop) return;
    const cfg = (C.programs && C.programs[p.id]) || {};
    const title = $("#modal-program-title");
    const media = $("#modal-program-media");
    const body = $("#modal-program-body");
    if (title) title.textContent = p.title;
    if (media) {
      if (cfg.clipUrl) {
        media.innerHTML =
          '<video controls playsinline preload="metadata" src="' +
          cfg.clipUrl +
          '" poster="' +
          (cfg.poster || "") +
          '"></video>';
      } else {
        media.innerHTML =
          '<div class="media-placeholder">' +
          (cfg.poster
            ? '<img src="' + cfg.poster + '" alt="" style="max-height:160px;margin:0 auto">'
            : "") +
          '<p style="margin-top:0.5rem">영상 준비 중</p></div>';
      }
    }
    if (body) {
      body.innerHTML =
        "<p>" +
        p.detail +
        '</p><div class="modal-section"><h4>이런 아이에게</h4><p>' +
        p.forWho +
        '</p></div><div class="modal-section"><h4>주간 활동</h4><p>' +
        p.weekly +
        "</p></div>";
    }
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
  }

  function closeProgramModal() {
    const backdrop = $("#program-modal");
    if (backdrop) {
      backdrop.classList.remove("open");
      backdrop.setAttribute("aria-hidden", "true");
      const media = $("#modal-program-media");
      if (media) media.innerHTML = "";
    }
  }

  function renderBlogStrip() {
    const wrap = $("#blog-strip");
    if (!wrap || !C.blogStrip) return;
    wrap.innerHTML = "";
    C.blogStrip.forEach((item) => {
      const a = document.createElement("a");
      a.className = "blog-card" + (item.url ? "" : " disabled");
      if (item.url) {
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      } else {
        a.href = "#";
        a.addEventListener("click", (e) => {
          e.preventDefault();
          showToast("네이버 블로그 링크 준비 중");
        });
      }
      a.innerHTML =
        '<span class="tag">' +
        item.tag +
        "</span><h3>" +
        item.title +
        "</h3><p>" +
        item.excerpt +
        "</p>";
      wrap.appendChild(a);
    });
  }

  function renderSns() {
    document.querySelectorAll("[data-sns]").forEach((el) => {
      const key = el.getAttribute("data-sns");
      const url = C.social && C.social[key];
      if (url) {
        el.href = url;
        el.target = "_blank";
        el.rel = "noopener noreferrer";
        el.classList.remove("muted");
      } else {
        el.href = "#";
        el.classList.add("muted");
        el.addEventListener("click", (e) => {
          e.preventDefault();
          showToast("링크 준비 중입니다.");
        });
      }
    });
  }

  function initYoutubeLite() {
    const el = $("#yt-lite");
    if (!el) return;
    const channel = C.social && C.social.youtube;
    const videoId = C.media && C.media.youtubeFeaturedId;
    const thumbSrc = videoId
      ? "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg"
      : "../img/video.webp";
    el.innerHTML =
      '<img src="' + thumbSrc + '" alt="YouTube"><span class="play">▶ 탭하면 영상 로드</span>';
    el.addEventListener("click", () => {
      if (videoId) {
        el.innerHTML =
          '<iframe width="100%" height="100%" style="border:0;aspect-ratio:16/9" src="https://www.youtube-nocookie.com/embed/' +
          videoId +
          '?rel=0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="YouTube"></iframe>';
      } else if (channel) {
        window.open(channel, "_blank", "noopener,noreferrer");
        showToast("채널로 이동합니다. 대표 영상 ID는 config.js에 넣을 수 있습니다.");
      }
    });
  }

  function initHeroMedia() {
    const frame = $("#hero-media");
    if (!frame || !C.media) return;
    if (C.media.heroVideoUrl) {
      frame.innerHTML =
        '<video controls playsinline preload="metadata" poster="' +
        (C.media.heroPoster || "") +
        '" src="' +
        C.media.heroVideoUrl +
        '"></video>';
    } else if (C.media.heroPoster) {
      frame.innerHTML = '<img src="' + C.media.heroPoster + '" alt="Mr. Jay">';
    } else if (C.media.teacherPhoto) {
      frame.innerHTML = '<img src="' + C.media.teacherPhoto + '" alt="Mr. Jay English">';
    }
  }

  let faqBank = [];

  function loadFaq() {
    return fetch("faq.json")
      .then((r) => r.json())
      .then((data) => {
        faqBank = data;
        renderFaqAccordion();
      })
      .catch(() => {
        faqBank = [];
      });
  }

  function renderFaqAccordion() {
    const list = $("#faq-accordion");
    if (!list) return;
    list.innerHTML = "";
    faqBank.slice(0, 8).forEach((item) => {
      const d = document.createElement("details");
      d.innerHTML =
        "<summary>" + item.q + '</summary><div class="faq-a">' + item.a + "</div>";
      list.appendChild(d);
    });
  }

  function normalize(text) {
    return (text || "").toLowerCase().replace(/\s+/g, "");
  }

  function matchFaq(query) {
    const q = normalize(query);
    if (!q) return null;
    let best = null;
    let bestScore = 0;
    faqBank.forEach((item) => {
      let score = 0;
      (item.keywords || []).forEach((kw) => {
        const k = normalize(kw);
        if (k && q.includes(k)) score += k.length;
        if (k && k.includes(q) && q.length >= 2) score += q.length;
      });
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    });
    return bestScore >= 2 ? best : null;
  }

  function appendChatMsg(log, text, who) {
    const div = document.createElement("div");
    div.className = "faq-msg " + who;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  function handoffHtml() {
    const phone = C.phone || "010-6616-2125";
    return (
      "잘 모르겠습니다. 선생님께 직접 물어보세요.\n전화: " +
      phone +
      "\n카카오 상담 버튼을 이용해 주세요. (링크 준비 중일 수 있음)\n수업료 등은 상담 시 안내드립니다."
    );
  }

  function initFaqChat() {
    const panel = $("#faq-chat");
    const log = $("#faq-chat-log");
    const input = $("#faq-chat-input");
    const send = $("#faq-chat-send");
    const openers = document.querySelectorAll("[data-open-faq-chat]");

    function toggle(open) {
      if (!panel) return;
      panel.classList.toggle("open", open);
      if (open && log && !log.dataset.greeted) {
        log.dataset.greeted = "1";
        appendChatMsg(
          log,
          "안녕하세요! MRJ FAQ입니다. 시간, 프로그램, 레벨테스트 등을 한국어로 물어보세요.",
          "bot"
        );
      }
    }

    openers.forEach((b) =>
      b.addEventListener("click", (e) => {
        e.preventDefault();
        toggle(true);
      })
    );
    $("#faq-chat-close")?.addEventListener("click", () => toggle(false));

    function submit() {
      if (!input || !log) return;
      const text = input.value.trim();
      if (!text) return;
      appendChatMsg(log, text, "user");
      input.value = "";
      const hit = matchFaq(text);
      setTimeout(() => {
        appendChatMsg(log, hit ? hit.a : handoffHtml(), "bot");
      }, 200);
    }

    send?.addEventListener("click", submit);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
    });
  }

  function initContactForm() {
    const form = $("#contact-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const lines = [
        "[MRJ 상담 신청]",
        "이름: " + data.get("name"),
        "자녀: " + data.get("child"),
        "연락처: " + data.get("phone"),
        "희망 시간: " + data.get("time"),
        "메시지: " + data.get("message"),
      ];
      const body = encodeURIComponent(lines.join("\n"));
      const subject = encodeURIComponent("MRJ 상담 신청");
      const mail = "mailto:?subject=" + subject + "&body=" + body;
      showToast("메일 앱이 열리지 않으면 카카오·전화로 내용을 보내 주세요.");
      window.location.href = mail;
    });
  }

  function injectProgramsSchema() {
    const el = $("#programs-json");
    if (!el) return;
    const schema = {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      name: "MRJ English",
      url: "https://mrjkorea.github.io/welcome/",
      telephone: C.phone,
      sameAs: [C.social?.x, C.social?.youtube, C.social?.newsletter].filter(Boolean),
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "MRJ Programs",
        itemListElement: PROGRAMS.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.title,
          description: p.benefit,
        })),
      },
    };
    el.textContent = JSON.stringify(schema, null, 2);
  }

  function bindModalClose() {
    $("#program-modal")?.addEventListener("click", (e) => {
      if (e.target.id === "program-modal" || e.target.closest(".modal-close")) {
        closeProgramModal();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindKakaoButtons();
    renderPrograms();
    renderBlogStrip();
    renderSns();
    initYoutubeLite();
    initHeroMedia();
    initFaqChat();
    initContactForm();
    injectProgramsSchema();
    bindModalClose();
    loadFaq();

    document.querySelectorAll("[data-phone]").forEach((a) => {
      a.href = phoneTel;
    });
  });
})();
