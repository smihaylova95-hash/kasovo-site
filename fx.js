/* Kasovo — interactive sections. No libraries, no tracking. */
(function () {
  "use strict";
  var EN = document.documentElement.lang === "en";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DAY = 864e5;

  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }
  function addYears(d, n) { var x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; }
  function fmt(d) {
    return d.toLocaleDateString(EN ? "en-GB" : "bg-BG", { day: "numeric", month: "short", year: "numeric" });
  }
  function fmtShort(d) {
    return d.toLocaleDateString(EN ? "en-GB" : "bg-BG", { day: "numeric", month: "short" });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }

  /* ---------- 1. The drawer ---------- */
  var section = document.getElementById("drawer");
  if (section) initDrawer(section);

  function initDrawer(sec) {
    var pile = sec.querySelector(".pile");
    var slotsBox = sec.querySelector(".slots");
    var done = sec.querySelector(".mini-done");
    var t = today();
    var items = EN ? [
      ["Laptop", "1,299.00", "Warranty", addYears(addDays(t, -40), 2), false],
      ["Trainers", "89.90", "Return by", addDays(t, 6), true],
      ["Coffee machine", "349.00", "Warranty", addYears(addDays(t, -300), 2), false],
      ["Headphones", "129.00", "Return by", addDays(t, 11), true],
      ["Vacuum cleaner", "249.00", "Warranty", addYears(addDays(t, -520), 2), false],
      ["Phone", "899.00", "Warranty", addYears(addDays(t, -90), 2), false]
    ] : [
      ["Лаптоп", "1 299,00", "Гаранция до", addYears(addDays(t, -40), 2), false],
      ["Маратонки", "89,90", "Връщане до", addDays(t, 6), true],
      ["Кафемашина", "349,00", "Гаранция до", addYears(addDays(t, -300), 2), false],
      ["Слушалки", "129,00", "Връщане до", addDays(t, 11), true],
      ["Прахосмукачка", "249,00", "Гаранция до", addYears(addDays(t, -520), 2), false],
      ["Телефон", "899,00", "Гаранция до", addYears(addDays(t, -90), 2), false]
    ];
    var head = EN ? "RECEIPT" : "КАСОВА БЕЛЕЖКА";
    var total = EN ? "TOTAL" : "ОБЩО";

    var receipts = [], cards = [];
    items.forEach(function (it, i) {
      var r = document.createElement("div");
      r.className = "rcpt";
      r.setAttribute("aria-hidden", "true");
      r.innerHTML = "<b>" + head + "</b>" +
        '<div class="ln"><span>' + it[0] + "</span><span>" + it[1] + "</span></div>" +
        '<div class="ln"><span>' + (EN ? "VAT 20%" : "ДДС 20%") + "</span><span>—</span></div>" +
        '<div class="ln tot"><span>' + total + "</span><span>" + it[1] + " €</span></div>" +
        '<div class="bc"></div>';
      sec.appendChild(r);
      var c = document.createElement("div");
      c.className = "slot card";
      c.innerHTML = "<i>" + it[0].charAt(0) + "</i><div><strong>" + it[0] + "</strong><span>" + it[1] + " €</span></div>" +
        '<em class="' + (it[4] ? "warn" : "") + '">' + it[2] + "<br>" + (it[4] ? fmtShort(it[3]) : it[3].getFullYear()) + "</em>";
      slotsBox.appendChild(c);
      cards.push(c);
      receipts.push({ el: r, x: 0, y: 0, vx: 0, vy: 0, rot: (Math.random() * 40 - 20), vr: 0, hx: 0, hy: 0, hr: 0, tx: 0, ty: 0, w: 118, h: 120 });
    });

    var pointer = { x: -9999, y: -9999, active: false };
    var geo = {};

    function layout() {
      var s = sec.getBoundingClientRect();
      var p = pile.getBoundingClientRect();
      var px = p.left - s.left, py = p.top - s.top, pw = p.width, ph = p.height;
      receipts.forEach(function (r, i) {
        r.w = r.el.offsetWidth; r.h = r.el.offsetHeight;
        var cols = pw > 500 ? 3 : 2;
        var cx = px + pw * ((i % cols) + 0.5) / cols;
        var cy = py + ph * (Math.floor(i / cols) + 0.55) / Math.ceil(receipts.length / cols);
        r.hx = cx - r.w / 2 + (Math.sin(i * 7.3) * 26);
        r.hy = cy - r.h / 2 + (Math.cos(i * 3.1) * 18);
        r.hr = Math.sin(i * 5.7) * 18;
        if (!geo.ready) { r.x = r.hx; r.y = r.hy; r.rot = r.hr; }
        var c = cards[i].getBoundingClientRect();
        r.tx = c.left - s.left + c.width / 2 - r.w / 2;
        r.ty = c.top - s.top + c.height / 2 - r.h / 2;
      });
      geo.ready = true;
    }

    function progress() {
      var s = sec.getBoundingClientRect();
      var vh = window.innerHeight;
      // starts when the drawer is well in view, finishes before it leaves
      return clamp((vh * 0.25 - s.top) / (s.height * 0.6), 0, 1);
    }

    function setPointer(e) {
      var s = sec.getBoundingClientRect();
      pointer.x = e.clientX - s.left; pointer.y = e.clientY - s.top; pointer.active = true;
    }
    pile.addEventListener("pointermove", setPointer);
    pile.addEventListener("pointerdown", setPointer);
    pile.addEventListener("pointerleave", function () { pointer.active = false; });

    function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

    var visible = false, raf = 0;
    function frame() {
      raf = 0;
      var P = reduce ? 1 : progress();
      var n = receipts.length, arrived = 0;
      receipts.forEach(function (r, i) {
        // each receipt flies in its own window of the overall progress
        var start = i / (n + 2), local = clamp((P - start) / (3 / (n + 2)), 0, 1), k = ease(local);
        if (local === 0) {
          // free in the drawer: spring to home + push away from the pointer
          var fx = (r.hx - r.x) * 0.02, fy = (r.hy - r.y) * 0.02;
          if (pointer.active) {
            var dx = r.x + r.w / 2 - pointer.x, dy = r.y + r.h / 2 - pointer.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
            if (d < 120) { var f = (120 - d) / 120 * 2.4; fx += dx / d * f; fy += dy / d * f; r.vr += (dx > 0 ? 1 : -1) * f * 0.6; }
          }
          r.vx = (r.vx + fx) * 0.86; r.vy = (r.vy + fy) * 0.86;
          r.vr = (r.vr + (r.hr - r.rot) * 0.02) * 0.85;
          r.x += r.vx; r.y += r.vy; r.rot += r.vr;
        }
        var x = r.x + (r.tx - r.x) * k, y = r.y + (r.ty - r.y) * k - Math.sin(k * Math.PI) * 60;
        var rot = r.rot * (1 - k), sc = 1 - 0.55 * k, op = local >= 1 ? 0 : 1 - Math.max(0, k - 0.75) * 4;
        r.el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + rot.toFixed(1) + "deg) scale(" + sc.toFixed(3) + ")";
        r.el.style.opacity = op.toFixed(2);
        var on = local > 0.85;
        if (on) arrived++;
        cards[i].classList.toggle("on", on);
      });
      done.classList.toggle("on", arrived === n);
      if (visible && !reduce) raf = requestAnimationFrame(frame);
    }

    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    layout();
    frame();
    window.addEventListener("resize", function () { layout(); kick(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) { layout(); kick(); } }, { rootMargin: "100px" }).observe(sec);
    } else { visible = true; kick(); }
    window.addEventListener("load", function () { layout(); kick(); });
  }

  /* ---------- 2. Deadline calculator ---------- */
  var calc = document.getElementById("calc");
  if (calc) initCalc(calc);

  function initCalc(box) {
    var dateIn = box.querySelector("#c-date");
    var segBtns = box.querySelectorAll(".seg button");
    var out = box.querySelector(".c-out");
    var t = today();
    dateIn.value = toISO(addDays(t, -5));
    dateIn.max = toISO(t);
    var mode = "online";

    function toISO(d) {
      var m = d.getMonth() + 1, dd = d.getDate();
      return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
    }
    function parse(v) { var p = (v || "").split("-"); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
    function daysWord(n) { return EN ? (n === 1 ? "day" : "days") : (n === 1 ? "ден" : "дни"); }

    function bar(start, end, remDays, nowLabel) {
      var span = end - start, pos = clamp((t - start) / span, 0, 1), over = t > end;
      var rems = remDays.map(function (rd) {
        var at = (addDays(end, -rd) - start) / span;
        return at > 0 && at < 1 ? '<span class="rem" style="left:' + (at * 100).toFixed(2) + '%"></span>' : "";
      }).join("");
      return '<div class="bar' + (over ? " over" : "") + '" data-pos="' + (pos * 100).toFixed(2) + '"><span class="fill"></span>' + rems +
        '<span class="now" data-l="' + nowLabel + '" style="left:0"></span></div>' +
        '<div class="ends"><span>' + fmt(start) + "</span><span>" + fmt(end) + "</span></div>";
    }

    function render() {
      var d = parse(dateIn.value);
      if (!d || d > t) { out.innerHTML = '<p class="fine">' + (EN ? "Pick a date up to today." : "Избери дата до днес.") + "</p>"; return; }
      var nowL = EN ? "today" : "днес";
      var html = "";
      if (mode === "online") {
        var wEnd = addDays(d, 14), left = Math.round((wEnd - t) / DAY);
        html += '<div class="tl"><h3>' + (EN ? "14 days to withdraw" : "14 дни за отказ") + "</h3>";
        html += left >= 0
          ? '<p><span class="big-n">' + left + "</span> " + daysWord(left) + (EN ? " left · until " : " остават · до ") + fmt(wEnd) + "</p>"
          : "<p>" + (EN ? "The standard 14-day period based on this date has passed. Exceptions or a longer period may apply." : "Стандартният 14-дневен срок според тази дата е изтекъл. Възможно е да се прилагат изключения или удължен срок.") + "</p>";
        html += bar(d, wEnd, [], nowL) + "</div>";
      } else {
        html += '<div class="tl"><p class="store-note">' + (EN ? "In a physical store, returning an item without a defect depends on the store's own policy. Kasovo keeps the store's deadline you enter." : "При покупка в магазин връщането на стока без дефект зависи от условията на магазина. Kasovo пази срока, който въведеш.") + "</p></div>";
      }
      var gEnd = addYears(d, 2), gLeft = Math.round((gEnd - t) / DAY);
      html += '<div class="tl"><h3>' + (EN ? "2-year legal guarantee" : "2 години законова гаранция") + "</h3>";
      html += '<p><span class="big-n">' + Math.max(0, gLeft) + "</span> " + daysWord(gLeft) + (EN ? " left · until " : " остават · до ") + fmt(gEnd) + "</p>";
      html += bar(d, gEnd, [], nowL) + "</div>";
      html += '<p class="fine">' + (EN
        ? "Counted from the date you picked (for online orders, use the delivery date). Kasovo reminds you before each deadline. An estimate, not legal advice."
        : "Смята се от избраната дата (при онлайн поръчка — датата на получаване). Kasovo ти напомня преди всеки срок. Ориентировъчно, не е правен съвет.") + "</p>";
      out.innerHTML = html;
      // animate fills after paint
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          out.querySelectorAll(".bar").forEach(function (b) {
            var p = b.getAttribute("data-pos") + "%";
            b.querySelector(".fill").style.width = p;
            b.querySelector(".now").style.left = p;
          });
        });
      });
    }

    segBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        segBtns.forEach(function (x) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("on"); b.setAttribute("aria-pressed", "true");
        mode = b.getAttribute("data-m");
        box.querySelector(".lbl-date").textContent = mode === "online"
          ? (EN ? "Delivery date" : "Дата на получаване")
          : (EN ? "Purchase date" : "Дата на покупка");
        render();
      });
    });
    dateIn.addEventListener("input", render);
    render();
  }
})();
