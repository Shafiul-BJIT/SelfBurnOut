using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SelfBurnOut.Controllers
{
    [Authorize]
    public class PomodoroController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
