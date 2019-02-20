#!/usr/bin/env bash
mkdir mirror
ls -a | grep -v mirror | xargs mv -t mirror
git clone https://github.com/karleberts/eventBus.git event-bus
cat <<EOT >> package.json
{
	"private": true,
	"workspaces": ["event-bus", "mirror"]
}
EOT
cp mirror/config.sample.json config.json
