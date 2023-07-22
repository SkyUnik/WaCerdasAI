{ pkgs }: {
	deps = [
		pkgs.nano
        pkgs.nodejs-18_x
        pkgs.yarn
        pkgs.python311
        pkgs.python311Packages.pip
        pkgs.conda
	];
}
