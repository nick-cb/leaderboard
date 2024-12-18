export default function Login() {
  return (
    <form method="post" action="http://localhost:8000/login">
      <div className="flex">
        UserName:{" "}
        <input type="text" name="username" className="border border-black" />
      </div>
      <div className="flex">
        Password:{" "}
        <input
          type="password"
          name="password"
          className="border border-black"
        />
      </div>
      <input type="submit" value="Submit" />
    </form>
  );
}
