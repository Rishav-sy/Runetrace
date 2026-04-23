# Contributing to Runetrace

First off, thanks for taking the time to contribute! 🚀

## How to Contribute

### Reporting Bugs
- Open an issue with a clear title and description
- Include steps to reproduce the bug
- Include your environment (OS, Python/Node version, etc.)

### Suggesting Features
- Open an issue with the `[Feature]` prefix
- Describe the feature and why it would be useful
- Include mockups or examples if possible

### Pull Requests
1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run the tests: `cd sdk && python -m pytest tests/ -v`
5. Commit with a clear message: `git commit -m "Add: your feature description"`
6. Push and open a PR

### Development Setup

```bash
# Clone the repo
git clone https://github.com/Rishav-sy/Runetrace.git
cd Runetrace

# Dashboard
cd dashboard && npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev

# Python SDK (editable install)
cd sdk && pip install -e .

# Node.js SDK
cd sdk-node && npm install && npm run build
```

### Database Setup
1. Create a free [Supabase](https://supabase.com) project
2. Run `dashboard/supabase_schema.sql` in the SQL Editor
3. Run `dashboard/supabase_requests.sql` in the SQL Editor

### Areas Where Help is Needed
- 🧩 **SDK:** Support for more LLM providers (Cohere, AI21, etc.)
- 📊 **Dashboard:** More chart types and visualizations
- 🧪 **Testing:** More comprehensive test coverage
- 📖 **Docs:** Better documentation and examples
- 🌍 **i18n:** Internationalization support

## Code of Conduct
Be respectful. Be constructive. We're all here to build cool things.

## License
By contributing, you agree that your contributions will be licensed under the MIT License.
