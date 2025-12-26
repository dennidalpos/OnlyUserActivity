$solution = "$PSScriptRoot\..\agent-windows\OnlyUserActivity.Agent.sln"
& msbuild $solution /p:Configuration=Release
