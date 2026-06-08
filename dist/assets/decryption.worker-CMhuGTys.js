(function () {
  self.onmessage = function (e) {
    let { encQuestions: t } = e.data;
    if (!t) {
      self.postMessage({ error: `No payload provided` });
      return;
    }
    try {
      let e = decodeURIComponent(escape(atob(t))),
        n = JSON.parse(e);
      self.postMessage({ success: !0, questions: n });
    } catch (e) {
      self.postMessage({ error: e.message });
    }
  };
})();
