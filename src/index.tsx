import { Hono } from 'hono'
import { ZennClient } from "@taisan11/zenn.js"
import { bodyLimit } from "hono/body-limit"
import { cache } from "hono/cache"
import { etag } from "hono/etag"
import { jsxRenderer } from "hono/jsx-renderer"
import { secureHeaders } from "hono/secure-headers"

const app = new Hono()
const client = new ZennClient()

// 上が縦画面で下が横画面
const mainCSS = `
  @media(orientation: portrait) {
    .metas {
      font-size: 0.8em;
    }
  }
  @media(orientation: landscape) {
    body {
      margin: 0 30vw;
    }
  }
  body {
    font-size:105%;
    margin-bottom: 5em;
    word-break: auto-phrase;
    text-wrap: pretty;
  }
  .metas {
    border: 3px solid gray;
    padding: 1em;
    * {
      margin:0;
      padding:0
    }
  }
  #a-title {
    margin-top: 0;
    font-size: 1.3em;
  }
`

// app.use(bodyLimit({ maxSize: 1024 * 512 })) // 512KB limit
app.use(cache({ cacheName:"zlv",cacheControl:"public, max-age=36000" }))
app.use(etag({weak: true}))
app.use(secureHeaders({}))
app.use(jsxRenderer(({ children }) => {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/zenn-content-css@latest/lib/index.css" />
        <script src="/ae.js"/>
        <style>{mainCSS}</style>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      </head>
      <body>{children}</body>
    </html>
  )
}))


app.get('/', async(c) => {
  const articles = await client.listArticles({order:"trending"})
  return c.render(<>
    <h1>Zenn viewer</h1>
    <h2>Trend</h2>
    <ul>
      {articles.articles.map(article => (
        <li key={article.id}>
          <a href={article.path}>{article.emoji}|{article.title}</a>
        </li>
      ))}
    </ul>
  </>)
})

app.get("/p/:name", async(c) => {
  const { name } = c.req.param()
  const publication = await client.getPublication(name)
  return c.render(<>
    <h1>{publication.publication.name}</h1>
    <p>{publication.publication.description}</p>
    <p><a href={"https://zenn.dev/"+publication.publication.name}>Zenn publication</a></p>
  </>)
})

app.get("/:username", async(c) => {
  const { username } = c.req.param()
  const user = await client.getUser(username)
  return c.render(<>
    <h1>{user.user.name}(@{user.user.username})</h1>
    <p>{user.user.bio}</p>
    <p><a href={"https://zenn.dev/"+user.user.username}>Zenn profile</a></p>
  </>)
})

app.get("/:username/articles/:slug", async(c) => {
  const { username, slug } = c.req.param()
  const article = await client.getArticle(slug)
  const body = article.article.body_html.replace(
    /(<iframe\b[^>]*?)\ssrc="https:\/\/embed\.zenn\.studio\/[^"]*"([^>]*?\sdata-content="https%3A%2F%2Ftwitter\.com%2F([^%"]+)%2Fstatus%2F(\d+)"[^>]*>)/g,
    '$1 src="https://nitter.net/$3/status/$4/embed"$2'
  )
  return c.render(<>
    <h1 id="a-title">{article.article.emoji}|{article.article.title}</h1>
    <div dangerouslySetInnerHTML={{ __html: body }} class="znc" />
    <div class="metas">
      <p>投稿日: {new Date(article.article.published_at).toLocaleString("ja-JP")}</p>
      <p>好き数: {article.article.liked_count}</p>
      {article.article.publication ? <><p>組織: <a href={"/p/" + article.article.publication.name}>{article.article.publication.name}</a></p></> : null}
      <a href={`/${article.article.user.username}`}>投稿者: {article.article.user.username}</a><br/>
      <a href={"https://zenn.dev/"+username+"/articles/"+slug}>zenn.devで見る</a>
    </div>
  </>)
})

export default app
