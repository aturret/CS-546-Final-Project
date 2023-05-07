const httpForms = document.querySelectorAll("form");
console.log('formPutRequests.js loaded');
if (httpForms) console.log("form found");
httpForms.forEach(form => {
    form.addEventListener("submit", function (event) {
        // event.preventDefault();
        const methodInput = form.querySelector('input[name="_method"][type="hidden"]');
        if (methodInput && (methodInput.value === "PUT" || methodInput.value === "DELETE" || methodInput.value === "PATCH")) {
            // 如果表单包含 name 为 "_method"，type 为 "hidden" 的 input 元素，并且其值为 "PUT" 或 "DELETE"
            event.preventDefault();
            console.log("Form submitted!");
            const method = methodInput.value;
            const url = form.getAttribute("action");
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            console.log("xhr opened!");
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    console.log(xhr.response);
                } else {
                    console.error(xhr.statusText);
                }
                const htmlContent = xhr.responseText;
                document.open();
                document.write(htmlContent);
                document.close();
            };
            xhr.onerror = function () {
                console.error(xhr.statusText);
            };
            console.log(xhr);
            const formData = new FormData(form);
            xhr.send(new URLSearchParams(formData).toString());
        }
    });
});
