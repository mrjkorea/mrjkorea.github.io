/** MRJ /welcome — Jay fills in null URLs when ready. Do not commit secrets here. */
window.MRJ_WELCOME_CONFIG = {
  phone: "010-6616-2125",
  phoneTel: "tel:+821066162125",
  hours: "월–금 12:00–20:00",
  studySite: "https://mrjkorea.github.io/",
  placementUrl: "https://mrjkorea.github.io/#placement",
  learnWorlds: "https://mrjkorea.learnworlds.com/",
  social: {
    x: "https://x.com/mrjayenglish",
    youtube: "https://www.youtube.com/@mrjayenglish",
    newsletter: "https://mrjkorea.github.io/wait-for-languages/",
    kakao: null,
    instagram: null,
    naverBlog: null,
  },
  /** Hero / teacher media — null shows “준비 중” placeholders */
  media: {
    heroPoster: null,
    heroVideoUrl: null,
    teacherPhoto: "../img/teacher.webp",
    teacherVideoUrl: null,
    youtubeFeaturedId: null,
  },
  /** Per-program: poster image path or null; clip URL or null */
  programs: {
    conversation: { poster: "../img/conversation.webp", clipUrl: null },
    vocabulary: { poster: "../img/words.webp", clipUrl: null },
    grammar: { poster: "../img/grammar.webp", clipUrl: null },
    decodable: { poster: "../img/decodable.webp", clipUrl: null },
    reading: { poster: "../img/reading.webp", clipUrl: null },
    typing: { poster: "../img/typing.webp", clipUrl: null },
    news: { poster: "../img/news.webp", clipUrl: null },
  },
  blogStrip: [
    {
      title: "언어 학습 팁 뉴스레터",
      excerpt: "매주 이메일로 받는 학습·교육 소식",
      url: "https://mrjkorea.github.io/wait-for-languages/",
      tag: "뉴스레터",
    },
    {
      title: "Mr Jay English YouTube",
      excerpt: "수업·학습 영상 채널",
      url: "https://www.youtube.com/@mrjayenglish",
      tag: "YouTube",
    },
    {
      title: "네이버 블로그",
      excerpt: "링크 준비 중 — 곧 연결됩니다",
      url: null,
      tag: "블로그",
    },
  ],
};
