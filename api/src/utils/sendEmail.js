// You can wire this to nodemailer or a provider later
export const sendEmail = async ({ to, subject, html }) => {
  console.log("DEV email =>", { to, subject });
  return true;
};
