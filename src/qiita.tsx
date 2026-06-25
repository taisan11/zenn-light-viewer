import { Hono } from "hono"
import { getCookie, setCookie, deleteCookie } from "hono/cookie"
import { jsxRenderer } from "hono/jsx-renderer"

const app = new Hono()
const API = "https://qiita.com/api/v2"

const mainCSS = `
  body {
    margin: 0 auto;
    max-width: 860px;
    padding: 0 16px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    background: #fff;
    color: #1a1a1a;
  }
  a { color: #0969da; }
  .top-header { margin: 24px 0; }
  .top-header h1 { margin: 0 0 12px; font-size: 1.5em; }
  .search-form { margin-bottom: 16px; }
  .search-form input {
    padding: 6px 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 16px;
    width: 240px;
  }
  .search-form button {
    padding: 6px 14px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
  }
  .pager { display: flex; gap: 8px; margin: 24px 0; }
  .metas {
    margin-top: 40px;
    padding: 16px;
    border-top: 1px solid #e0e0e0;
    color: #666;
    font-size: 14px;
  }
  .metas p { margin: 4px 0; }
  .api-key-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 8px 12px;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 13px;
  }
  input[type="text"],
  input[type="password"] { font-size: 16px; }

  @media (prefers-color-scheme: dark) {
    :root { color-scheme: dark; }
    body { background: #0d1117; color: #e6edf3; }
    a { color: #58a6ff; }
    .search-form input,
    .search-form button,
    input[type="password"] {
      background: #161b22;
      color: #e6edf3;
      border-color: #30363d;
    }
    .metas { color: #8b949e; border-color: #30363d; }
    .api-key-bar { background: #161b22; border-color: #30363d; }
    blockquote { color: #e6edf3; border-color: #30363d; }
    .it-MdContent blockquote { color: #e6edf3; border-color: #30363d; }
  }
  html[data-theme="dark"] {
    color-scheme: dark;
  }
  html[data-theme="dark"] body {
    background: #0d1117;
    color: #e6edf3;
  }
  html[data-theme="dark"] a { color: #58a6ff; }
  html[data-theme="dark"] .search-form input,
  html[data-theme="dark"] .search-form button,
  html[data-theme="dark"] input[type="password"] {
    background: #161b22;
    color: #e6edf3;
    border-color: #30363d;
  }
  html[data-theme="dark"] .metas { color: #8b949e; border-color: #30363d; }
  html[data-theme="dark"] blockquote { color: #e6edf3; border-color: #30363d; }
  html[data-theme="dark"] .it-MdContent blockquote { color: #e6edf3; border-color: #30363d; }
  html[data-theme="dark"] blockquote { color: #e6edf3; border-color: #30363d; }
  html[data-theme="dark"] .api-key-bar { background: #161b22; border-color: #30363d; }
`

app.use(jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var d=document.documentElement;
            var t=localStorage.getItem('theme');
            if(t){d.setAttribute('data-theme',t)}
            else if(matchMedia('(prefers-color-scheme:dark)').matches){d.setAttribute('data-theme','dark')}
          })();
        `}} />
        <link rel="stylesheet" href="https://cdn.qiita.com/assets/public/article-6edeacb0ad1dfec20f4e6089828eb303.min.css" />
        <style>{mainCSS}</style>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://cdn.qiita.com/assets/public/v3-embed-init-99914e90abcc3fff.min.js" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener("DOMContentLoaded", function() {
            if (window.qiitaEmbedInit) {
              var el = document.querySelector(".it-MdContent");
              if (el) {
                window.qiitaEmbedInit.applyMathJax(el);
                window.qiitaEmbedInit.executeScriptTagsInElement(el);
              }
            }
          });
        `}} />
        {children}
      </body>
    </html>
  )
}))

function authHeaders(c: any): Record<string, string> {
  const token = getCookie(c, "qiita_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function qiitaFetch(c: any, path: string, init?: RequestInit) {
  const headers = { ...authHeaders(c), ...init?.headers } as Record<string, string>
  if (!headers["Content-Type"]) headers["Content-Type"] = "application/json"
  return fetch(`${API}${path}`, { ...init, headers })
}

app.post("/token", async (c) => {
  const ct = c.req.header("content-type") || ""
  const token = ct.includes("json")
    ? (await c.req.json()).token
    : (await c.req.parseBody()).token as string
  setCookie(c, "qiita_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: 31536000,
    path: "/qiita",
  })
  return c.redirect("/qiita")
})

app.post("/token/delete", async (c) => {
  deleteCookie(c, "qiita_token", { path: "/qiita" })
  return c.redirect("/qiita")
})

app.get("/", async (c) => {
  const q = c.req.query("q") || ""
  const p = c.req.query("p") || "1"
  const token = getCookie(c, "qiita_token")
  const itemsRes = await qiitaFetch(c, `/items?page=${p}&per_page=20${q ? `&query=${encodeURIComponent(q)}` : ""}`)
  const items = await itemsRes.json() as any[]

  return c.render(<>
    <h1>Qiita Viewer</h1>
    {token ? (
      <p>
        API key registered
        <form action="/qiita/token/delete" method="post" style="display:inline">
          <button type="submit">Delete API Key</button>
        </form>
      </p>
    ) : (
      <form action="/qiita/token" method="post">
        <input type="password" name="token" placeholder="Qiita API Key" />
        <button type="submit">Register API Key</button>
      </form>
    )}
    <form action="/qiita" method="get">
      <input type="text" name="q" placeholder="Search query" value={q} />
      <button type="submit">Search</button>
    </form>
    {q ? <h2>Search: {q}</h2> : null}
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <a href={`/qiita/items/${item.id}`}>{item.title}</a>
          <span> by </span>
          <a href={`/qiita/users/${item.user.id}`}>{item.user.id}</a>
          <span> ({item.likes_count} likes)</span>
        </li>
      ))}
    </ul>
    <div>
      {Number(p) > 1 ? <a href={`/qiita?q=${q}&p=${Number(p) - 1}`}>前のページ</a> : null}
      <span> </span>
      {items.length > 0 ? <a href={`/qiita?q=${q}&p=${Number(p) + 1}`}>次のページ</a> : null}
    </div>
  </>)
})

app.get("/items/:id", async (c) => {
  const { id } = c.req.param()
  const res = await qiitaFetch(c, `/items/${id}`)
  const item = await res.json() as any

  return c.render(<>
    <div class="it-MdContent">
      <h1>{item.title}</h1>
    </div>
    <div class="it-Tags">
      {item.tags.map((tag: any) => (
        <a key={tag.name} class="it-Tags_item" href={`/qiita?q=tag:${encodeURIComponent(tag.name)}`}>{tag.name}</a>
      ))}
    </div>
    <div class="it-MdContent" dangerouslySetInnerHTML={{ __html: item.rendered_body }} />
    <div class="metas">
      <p>投稿日: {new Date(item.created_at).toLocaleString("ja-JP")}</p>
      <p>更新日: {new Date(item.updated_at).toLocaleString("ja-JP")}</p>
      <p>いいね: {item.likes_count} | ストック: {item.stocks_count}</p>
      {item.page_views_count != null ? <p>閲覧数: {item.page_views_count}</p> : null}
      <a href={item.url}>Qiitaで見る</a>
    </div>
  </>)
})

app.get("/users/:userId", async (c) => {
  const { userId } = c.req.param()
  const p = c.req.query("p") || "1"
  const [userRes, itemsRes] = await Promise.all([
    qiitaFetch(c, `/users/${userId}`),
    qiitaFetch(c, `/users/${userId}/items?page=${p}&per_page=20`),
  ])
  const user = await userRes.json() as any
  const items = await itemsRes.json() as any[]

  return c.render(<>
    <h1>{user.id}</h1>
    {user.name ? <p>{user.name}</p> : null}
    {user.description ? <p>{user.description}</p> : null}
    {user.profile_image_url ? <img src={user.profile_image_url} alt={user.id} /> : null}
    <p>Articles: {user.items_count} | Followers: {user.followers_count} | Followees: {user.followees_count}</p>
    <h2>Items</h2>
    <ul>
      {items.map(item => (
        <li key={item.id}>
          <a href={`/qiita/items/${item.id}`}>{item.title}</a>
          <span> ({item.likes_count} likes)</span>
        </li>
      ))}
    </ul>
    <div>
      {Number(p) > 1 ? <a href={`/qiita/users/${userId}?p=${Number(p) - 1}`}>前のページ</a> : null}
      <span> </span>
      {items.length > 0 ? <a href={`/qiita/users/${userId}?p=${Number(p) + 1}`}>次のページ</a> : null}
    </div>
  </>)
})
export default app
