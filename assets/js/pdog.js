/* ─────────────────────────────────────────────────────────────
   阿狗 ── 用 Eric 原本的線畫（切乾淨的 dog_cut.png）做剪紙人偶
   pdogHTML({cls:'idle'|'walk'|'happy', tag:'5', base:'assets/img/'}) → HTML
   容器 .pdog 寬度自訂，比例 617:829（dog_cut.png 的尺寸）；嘴下桌號牌的大小跟著容器的 font-size 走。
   換圖時要一起調：aspect-ratio、.pblink span 的位置（蓋在眼睛上）、.ptag 的 top（嘴巴下方）。
   配色沿用 app.css 的色票：桌號牌暖褐底（--c-gold-dk）白字、線條深棕（--c-ink）。
   ───────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  window.pdogHTML = function (o) {
    o = o || {};
    const b = o.base || 'assets/img/';
    const tag = o.tag != null ? '<div class="ptag"><i></i><b>' + o.tag + '</b></div>' : '';
    return '<div class="pdog ' + (o.cls || 'idle') + '"><div class="pshadow"></div><div class="pbody">' +
      '<img src="' + b + 'dog_cut.png" alt="阿狗"><div class="pblink"><span></span><span></span></div>' + tag +
      '</div></div>';
  };
  const css = `
.pdog{position:relative;aspect-ratio:617/829;display:block}
.pdog .pbody{position:absolute;left:0;top:0;width:100%;transform-origin:50% 92%}
.pdog .pbody img{display:block;width:100%;height:auto;pointer-events:none;-webkit-user-drag:none}
.pdog .pshadow{position:absolute;left:12%;right:12%;bottom:1%;height:6%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(74,64,60,.26),rgba(74,64,60,0) 70%)}
.pdog .pblink{position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;animation:pblink 4.6s infinite}
.pdog .pblink span{position:absolute;width:8%;height:6%;background:#FDF9ED;border-radius:50%;border-bottom:1.6px solid #4A403C;box-sizing:border-box}
.pdog .pblink span:first-child{left:33%;top:29%}.pdog .pblink span:last-child{left:56%;top:26.5%}
@keyframes pblink{0%,94%,100%{opacity:0}95%,98%{opacity:1}}
.pdog.idle .pbody{animation:pbreathe 3s ease-in-out infinite}
.pdog.walk .pbody{animation:phop .5s ease-in-out infinite}
.pdog.walk .pshadow{animation:pshadow .5s ease-in-out infinite}
.pdog.happy .pbody{animation:pbighop .58s ease-in-out infinite}
.pdog.happy .pshadow{animation:pshadow .58s ease-in-out infinite}
/* 查詢中：鼻子壓低左右聞 */
.pdog.sniff .pbody{animation:psniff 1.1s ease-in-out infinite}
@keyframes psniff{0%,100%{transform:rotate(-3deg) translateY(1%)}30%{transform:rotate(-8deg) translateY(2.6%)}65%{transform:rotate(4deg) translateY(1.4%)}}
/* 嘴下的桌號牌：要大、要清楚 */
.pdog .ptag{position:absolute;left:50%;top:43%;transform:translateX(-50%);transform-origin:50% 0;width:32%;text-align:center}
.pdog .ptag i{display:block;width:2px;height:5%;min-height:3px;background:#4A403C;margin:0 auto}
.pdog .ptag b{display:block;background:#A9856E;border:2px solid #FFFFFF;outline:1.5px solid #A9856E;border-radius:4px;color:#FFFFFF;font-family:'Noto Serif TC',serif;font-weight:500;font-size:2.2em;line-height:1.3;padding:0 3px;box-shadow:0 2px 6px rgba(74,64,60,.25)}
.pdog.walk .ptag{animation:pswing .5s ease-in-out infinite}
@keyframes pbreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.01,1.02) rotate(-1deg)}}
@keyframes phop{0%,100%{transform:translateY(0) scale(1.03,.97) rotate(-3deg)}50%{transform:translateY(-9%) scale(.97,1.04) rotate(3deg)}}
@keyframes pbighop{0%,100%{transform:translateY(0) scale(1.04,.96) rotate(-5deg)}45%{transform:translateY(-18%) scale(.96,1.05) rotate(5deg)}}
@keyframes pshadow{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(.75);opacity:.55}}
@keyframes pswing{0%,100%{transform:translateX(-50%) rotate(-7deg)}50%{transform:translateX(-50%) rotate(7deg)}}
@media (prefers-reduced-motion:reduce){.pdog *{animation:none !important}}
`;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);
})();
