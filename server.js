const express = require('express');
const path = require('path');
const swagger2openapi = require('swagger2openapi');
const yaml = require('js-yaml');

const app = express();
const PORT = process.env.PORT || 3000;

const yamlOpts = { lineWidth: -1, noRefs: true, sortKeys: false };

app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: ['text/plain', 'application/x-yaml'], limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getRawContent(req) {
  if (typeof req.body === 'string') return req.body.trim();
  if (req.body && typeof req.body.content === 'string') return req.body.content.trim();
  return null;
}

app.post('/api/convert', async (req, res) => {
  try {
    const raw = getRawContent(req);
    if (!raw) {
      return res.status(400).json({
        error: 'Envie o conteúdo (JSON ou YAML) no body. Use { "content": "..." } ou texto puro.',
      });
    }

    let yamlStr;

    const asJson = (() => {
      try {
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    })();

    const asYaml = (() => {
      try {
        return yaml.load(raw);
      } catch (_) {
        return null;
      }
    })();

    const spec = asJson && typeof asJson === 'object' ? asJson : (asYaml && typeof asYaml === 'object' ? asYaml : null);

    if (spec && spec.swagger === '2.0') {
      const openapi = await swagger2openapi.convertObj(spec, {
        patch: true,
        resolve: false,
      });
      yamlStr = yaml.dump(openapi.openapi, yamlOpts);
    } else if (spec && spec.openapi && String(spec.openapi).startsWith('3')) {
      yamlStr = yaml.dump(spec, yamlOpts);
    } else if (spec && typeof spec === 'object') {
      yamlStr = yaml.dump(spec, yamlOpts);
    } else {
      return res.status(400).json({
        error: 'Conteúdo inválido. Use Swagger 2.0 (JSON/YAML), OpenAPI 3 (JSON) ou YAML.',
      });
    }

    res.json({ yaml: yamlStr });
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err.message || 'Falha ao processar o conteúdo.',
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
});
