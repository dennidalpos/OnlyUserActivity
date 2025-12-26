OnlyUserActivity starter monorepo.

Prerequisites: Node.js LTS, npm, .NET Framework 4.8 developer pack, Visual Studio with MSBuild, WiX Toolset (optional).

Run server: cd server && npm install && npm run dev
Run dashboard: cd dashboard && npm install && npm run dev
Build agent: msbuild agent-windows/OnlyUserActivity.Agent.sln /p:Configuration=Release
