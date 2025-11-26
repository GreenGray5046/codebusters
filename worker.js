addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  let path = url.pathname === '/' ? '/index.html' : url.pathname

  // Only allow files in /public
  const allowedFiles = ['/index.html', '/app.js', '/style.css']
  if (!allowedFiles.includes(path)) {
    return new Response('404 Not Found', { status: 404 })
  }

  // Fetch the file directly from GitHub
  const githubURL = `https://raw.githubusercontent.com/GreenGray5046/codebusters/main/public${path}`
  try {
    const response = await fetch(githubURL)
    if (!response.ok) throw new Error('Not Found')

    const contentType = getContentType(path)
    const body = path.endsWith('.css') || path.endsWith('.js')
      ? await response.text()
      : await response.text()

    return new Response(body, { headers: { 'Content-Type': contentType } })
  } catch (err) {
    return new Response('404 Not Found', { status: 404 })
  }
}

function getContentType(path) {
  if (path.endsWith('.html')) return 'text/html'
  if (path.endsWith('.css')) return 'text/css'
  if (path.endsWith('.js')) return 'application/javascript'
  return 'text/plain'
}
