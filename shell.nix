{
  pkgs ? import <nixpkgs> {},
  mkShell ? pkgs.mkShell,
}:

mkShell rec {
  buildInputs = with pkgs; [
    nodejs-10_x
    (yarn.override { nodejs = nodejs-10_x; })
    foreman
  ];

  shellHook = ''
    export PATH="$PWD/node_modules/.bin/:$PATH"
    export NODE_ENV=development
  '';
}
