const CONTROL_PATH = process.env.PARADIGM_SSH_CONTROL_PATH || "/tmp/paradigm-release-ssh-%C"
const CONTROL_PERSIST_SECONDS = process.env.PARADIGM_SSH_CONTROL_PERSIST_SECONDS || "180"

/**
 * Reuse one authenticated SSH connection across release subprocesses.
 * Production rejects the sixth rapid connection, so release checks must share
 * a control socket instead of opening a fresh session for every command.
 */
export function sshArgs(target, { connectTimeout, acceptNew = false } = {}) {
  const args = [
    "-o", "BatchMode=yes",
    "-o", "ControlMaster=auto",
    "-o", `ControlPersist=${CONTROL_PERSIST_SECONDS}`,
    "-o", `ControlPath=${CONTROL_PATH}`,
  ]
  if (connectTimeout) args.push("-o", `ConnectTimeout=${connectTimeout}`)
  if (acceptNew) args.push("-o", "StrictHostKeyChecking=accept-new")
  return [...args, target]
}
