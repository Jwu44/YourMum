const url = "http://localhost:" + String(5000);
const token = localStorage.getItem("token");

const genericFetch = async (pathName,method,callBack,errorCallBack, payload) => {
    const resp = await fetch(url + pathName, {
      method: method,
      headers: {
        "Content-type": "application/json",
      },
      body: method === 'GET' ? undefined: JSON.stringify({
        payload
      }),
    });
    const data = await resp.json();
    if (data) callBack(data);
    else errorCallBack();
}

export default genericFetch;

