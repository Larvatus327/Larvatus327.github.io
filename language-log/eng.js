/* eng.js — Hero(스와이퍼) + 블로그 리스트, NaN-safe, 헤더/본문 개수 동기화 */

(function(){
  // Keep this list in sync with published post files.
  const POST_IDS = [1, 2, 3, 4];
  const GRID_LOAD_BATCH  = 8;

  // state
  let postDataList    = [];
  let loadedGridCount = 0;
  let isFiltering     = false;
  let currentLabelIndex = null;
  let swiper;

  // DOM refs (DOMContentLoaded에서 세팅)
  let swiperWrapper; // .mySwiper .swiper-wrapper (id="cardContainer")
  let gridContainer; // #postGridContainer

  // ---------- utils ----------
  function calculateDaysAgo(dateString){
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const days = Math.floor((Date.now() - d.getTime())/86400000);
    return days === 0 ? "today" : `${days} days ago`;
  }

  function metaHTML(author, dateStr){
    const days = calculateDaysAgo(dateStr);
    const parts = [];
    if (author) parts.push(`By <span class="folder-author">${author}</span>`);
    if (days)   parts.push(days);
    return parts.join(" · ");
  }

  function setTotalCount(n){
    const el = document.getElementById("totalCount");
    if (el) el.textContent = `${n}`;
    const h = document.getElementById("headerTotalCount");
    if (h) h.textContent = n;
  }

  function sortPosts(mode){
    if (!postDataList.length) return;
    if (mode === "latest")  postDataList.sort((a,b)=> new Date(b.date) - new Date(a.date));
    if (mode === "oldest")  postDataList.sort((a,b)=> new Date(a.date) - new Date(b.date));
    if (mode === "title")   postDataList.sort((a,b)=> (a.title||"").localeCompare(b.title||""));
  }

  // ---------- Hero ----------
  function createHeroSlide(data){
    if (!swiperWrapper) return;
    const slide = document.createElement("div");
    slide.className = "swiper-slide";

    const clean = document.createElement("div");
    clean.innerHTML = data.html;
    clean.querySelectorAll(".post-date, time, .post-author, .blog-meta, .card-meta, .meta").forEach(n=>n.remove());

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      ${clean.innerHTML}
      <div class="card-meta">${metaHTML(data.author, data.date)}</div>
    `;

    card.querySelectorAll("img").forEach(img=>{
      img.addEventListener("mouseenter", ()=> img.classList.add("hover-zoom"));
      img.addEventListener("mouseleave", ()=> img.classList.remove("hover-zoom"));
    });
    card.addEventListener("click", ()=>{ currentLabelIndex = data.labelIndex; });

    slide.appendChild(card);
    swiperWrapper.appendChild(slide);
  }

  function updatePostNumber(){
    if (!swiper || typeof swiper.realIndex === "undefined" || !postDataList.length) return;
    const number = String((swiper.realIndex % postDataList.length) + 1).padStart(2,"0");
    const el = document.getElementById("postNumber");
    if (el) el.textContent = number;
  }
  function updateDateAndAuthor(){
    if (!swiper || !postDataList.length) return;
    const idx = swiper.realIndex % postDataList.length;
    const data = postDataList[idx];
    if (!data) return;
    const dateEl   = document.getElementById("postDate");
    const authorEl = document.getElementById("postAuthor");
    const days     = calculateDaysAgo(data.date);
    if (dateEl)   dateEl.textContent   = days || "";
    if (authorEl) authorEl.textContent = data.author || "";
  }
  function initSwiper(){
    const el = document.querySelector(".mySwiper");
    if (!el || !swiperWrapper) return;
    if (swiper) try { swiper.destroy(true,true); } catch(e){}
    swiper = new Swiper(".mySwiper", {
      slidesPerView: 3,
      spaceBetween: 30,
      loop: postDataList.length > 3,
      autoplay: { delay: 3000, disableOnInteraction: false },
      speed: 800,
      navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
      on: {
        init: ()=>{ updatePostNumber(); updateDateAndAuthor(); },
        slideChange: ()=>{ updatePostNumber(); updateDateAndAuthor(); }
      },
      breakpoints: {
        320:  { slidesPerView: 1, spaceBetween: 16 },
        768:  { slidesPerView: 2, spaceBetween: 24 },
        1200: { slidesPerView: 3, spaceBetween: 30 }
      }
    });
  }

  // ---------- 블로그 리스트 ----------
  function createBlogItem(data){
    const item = document.createElement("article");
    item.className = "blog-item";

    const main = document.createElement("div");
    main.className = "blog-main";
    main.innerHTML = `
      <h3 class="blog-title">
        <a href="/language-log/note.html?label=${data.labelIndex}">${data.title || ""}</a>
      </h3>
      <div class="blog-meta">${metaHTML(data.author, data.date)}</div>
      <p class="blog-excerpt">${data.desc || ""}</p>
      <div class="blog-actions">
        <a class="folder-btn note" href="/language-log/note.html?label=${data.labelIndex}">Log</a>
        <a class="folder-btn" href="${data.githubLink || "#"}" target="_blank">GitHub</a>
      </div>
    `;

    const thumb = document.createElement("div");
    thumb.className = "blog-thumb";
    thumb.innerHTML = `
      <a href="/language-log/note.html?label=${data.labelIndex}">
        ${data.imgThumb ? `<img src="${data.imgThumb}" alt="">` : ""}
      </a>`;
    item.append(main, thumb);
    return item;
  }

  function resetLoadMoreVisibility(){
    const btn = document.getElementById("loadMoreBtn");
    if (!btn) return;
    const show = !isFiltering && (loadedGridCount < postDataList.length);
    btn.style.display = show ? "inline-flex" : "none";
  }

  function loadNextGridBatch(){
    const nextBatch = postDataList.slice(loadedGridCount, loadedGridCount + GRID_LOAD_BATCH);
    nextBatch.forEach(d => {
      gridContainer.appendChild(createBlogItem(d));
    });
    loadedGridCount += nextBatch.length;
    resetLoadMoreVisibility();
  }

  function filterGridCards(keyword){
    const kw = (keyword || "").toLowerCase();
    isFiltering = kw.length > 0;
    gridContainer.innerHTML = "";

    const filtered = postDataList.filter(d =>
      (d.title  || "").toLowerCase().includes(kw) ||
      (d.desc   || "").toLowerCase().includes(kw) ||
      (d.author || "").toLowerCase().includes(kw)
    );

    setTotalCount(filtered.length);

    if (!filtered.length){
      const msg = document.createElement("div");
      msg.textContent = "검색 결과 없음";
      msg.style.cssText = "text-align:center;color:#ADADAA;font-family:'Caveat',cursive;font-size:16px;padding:32px 0;";
      gridContainer.appendChild(msg);
      resetLoadMoreVisibility();
      return;
    }

    filtered.forEach(d => gridContainer.appendChild(createBlogItem(d)));
    resetLoadMoreVisibility();
  }

  // ---------- 검색·정렬 이벤트 바인딩 ----------
  // ★ 핵심 수정: header.html이 비동기로 로드되므로
  //   DOMContentLoaded 시점엔 searchInput이 아직 DOM에 없음.
  //   MutationObserver로 header-placeholder에 자식이 생기면 그때 이벤트 연결.
  function bindSearchAndSort(){
    const searchInput = document.querySelector(".hd-search-input") ||
                        document.querySelector(".search-input-wrapper input[type='text']") ||
                        document.getElementById("postSearchInput");
    const searchBtn   = document.querySelector(".hd-search-btn") ||
                        document.querySelector(".search-button");
    const sortSelect  = document.getElementById("sortSelect");

    const runFilter = () => {
      const kw = (searchInput?.value || "").trim();
      if (!kw){
        isFiltering = false;
        gridContainer.innerHTML = "";
        loadedGridCount = 0;
        setTotalCount(postDataList.length);
        loadNextGridBatch();
      } else {
        filterGridCards(kw);
      }
      resetLoadMoreVisibility();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (searchInput){
      searchInput.addEventListener("input", runFilter);
      searchInput.addEventListener("keydown", e=>{ if (e.key === "Enter") runFilter(); });
    }
    if (searchBtn) searchBtn.addEventListener("click", runFilter);

    if (sortSelect){
      sortSelect.addEventListener("change", ()=>{
        const v = sortSelect.value;
        sortPosts(v);
        const kw = (searchInput?.value || "").trim();
        gridContainer.innerHTML = "";
        loadedGridCount = 0;
        if (kw) filterGridCards(kw);
        else { setTotalCount(postDataList.length); loadNextGridBatch(); }
        resetLoadMoreVisibility();
      });
    }
  }

  function waitForHeaderAndBind(){
    // 이미 header input이 DOM에 있으면 즉시 실행
    if (document.querySelector(".hd-search-input") || document.querySelector(".search-input-wrapper input[type='text']")){
      bindSearchAndSort();
      return;
    }

    // 없으면 header-placeholder에 자식이 추가될 때까지 대기
    const placeholder = document.getElementById("header-placeholder") || document.body;
    const observer = new MutationObserver(()=>{
      if (document.querySelector(".hd-search-input") || document.querySelector(".search-input-wrapper input[type='text']")){
        observer.disconnect();
        bindSearchAndSort();
      }
    });
    observer.observe(placeholder, { childList: true, subtree: true });
  }

  // ---------- 데이터 로드 ----------
  async function loadCards(){
    for (const i of POST_IDS){
      try{
        const resp = await fetch(`post/post${i}.html`);
        if (!resp.ok) continue;
        const html = await resp.text();

        const temp = document.createElement("div");
        temp.innerHTML = html;

        const title = (temp.querySelector("h3")?.textContent || "").trim();
        const desc  = (temp.querySelector("p")?.textContent || "").trim();

        const imgEl = temp.querySelector("img.card-thumbnail, img");
        const imgSrc = imgEl?.getAttribute("src") || "";
        const imgThumb = imgSrc;
        const imgBg    = imgSrc;

        const dateEl = temp.querySelector(".post-date") || temp.querySelector("time");
        const date   = (dateEl?.getAttribute?.("datetime") || dateEl?.textContent || "").trim();
        const author = (temp.querySelector(".post-author")?.textContent || "").trim();

        const clean = document.createElement("div");
        clean.innerHTML = temp.innerHTML;
        clean.querySelectorAll(".post-date, time, .post-author, .blog-meta, .card-meta, .meta").forEach(n=>n.remove());

        const data = {
          html: clean.innerHTML,
          title, desc,
          imgThumb, imgBg,
          date, author,
          githubLink: temp.querySelector(".post-github")?.getAttribute("href") || "#",
          labelIndex: i
        };

        createHeroSlide(data);
        postDataList.push(data);

      } catch(e){
        console.warn(`post${i}.html 불러오기 실패`, e);
      }
    }

    setTotalCount(postDataList.length);
    loadedGridCount = 0;
    loadNextGridBatch();
    initSwiper();

    const loadBtn = document.getElementById("loadMoreBtn");
    if (loadBtn) loadBtn.addEventListener("click", loadNextGridBatch);
  }

  // ---------- DOMContentLoaded ----------
  document.addEventListener("DOMContentLoaded", ()=>{
    swiperWrapper = document.querySelector(".mySwiper .swiper-wrapper") || document.getElementById("cardContainer");
    gridContainer = document.getElementById("postGridContainer");

    sortPosts("latest");
    loadCards();

    // ★ 검색·정렬 이벤트는 header 로드 완료 후에 연결
    waitForHeaderAndBind();

    // Discover 버튼
    const discoverBtn = document.getElementById("discoverBtn");
    if (discoverBtn){
      discoverBtn.addEventListener("click", ()=>{
        const idx = currentLabelIndex ?? (postDataList.length || 1);
        window.location.href = `/language-log/note.html?label=${idx}`;
      });
    }
  });
})();