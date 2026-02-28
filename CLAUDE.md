# CLAUDE.md — Agent Instructions

## App URL
https://seap-pied.vercel.app

## YOUR WORKFLOW
1. Read the PDF file from disk using the Read File tool
2. Extract product names and descriptions from the text
3. Send products to the app via curl (see below)
4. For each product: open Chrome → go to chat.openai.com → search for the product → extract URL
5. Send all found URLs to the app via curl (see below)

## SEND PRODUCTS TO APP
```
curl -X POST https://seap-pied.vercel.app/api/claude-inject \
  -H "Content-Type: application/json" \
  -H "X-Claude-Token: dev-token" \
  -d "{\"action\":\"inject_products\",\"documentName\":\"FILE_NAME_HERE\",\"products\":[{\"productName\":\"PRODUCT 1\",\"productDescription\":\"DESCRIPTION 1\"},{\"productName\":\"PRODUCT 2\",\"productDescription\":\"DESCRIPTION 2\"}]}"
```

## SEND LINKS TO APP
```
curl -X POST https://seap-pied.vercel.app/api/claude-inject \
  -H "Content-Type: application/json" \
  -H "X-Claude-Token: dev-token" \
  -d "{\"action\":\"inject_links\",\"links\":[{\"productName\":\"PRODUCT 1\",\"url\":\"https://...\"}]}"
```

## PING TO TEST CONNECTION
```
curl -X POST https://seap-pied.vercel.app/api/claude-inject \
  -H "Content-Type: application/json" \
  -H "X-Claude-Token: dev-token" \
  -d "{\"action\":\"ping\"}"
```

## RULES
- NEVER use the browser file picker — it will always fail
- Always use curl from the terminal to send data
- After each curl, verify it returned {"ok":true} before continuing
- Wait 5 seconds after sending before taking a screenshot to verify the app updated
- If ChatGPT asks to log in, screenshot it and tell the user
- Only send URLs you are confident about — if unsure, ask first
