(function () {
  "use strict";
  var confirmedAt = Number(sessionStorage.getItem("mpp_deletion_completed") || 0);
  sessionStorage.removeItem("mpp_deletion_completed");
  var notice = document.getElementById("deletion-completed");
  if (notice && confirmedAt > 0 && Date.now() - confirmedAt < 60000) notice.hidden = false;
})();
