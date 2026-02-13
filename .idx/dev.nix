{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-23.11"; # or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20,
    pkgs.nodePackages.npm
  ];
  # Sets environment variables in the workspace
  env = {};
  # Fast way to run services in the workspace.
  # services.port."3000".command = "npm run dev";
}
