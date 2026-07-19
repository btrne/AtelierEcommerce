using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;

namespace Atelier.Api.Controllers.Auth
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly IApplicationDbContext _context;

        public UsersController(IApplicationDbContext context)
        {
            _context = context;
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _context.Users
                .Include(u => u.UserAddresses)
                .Include(u => u.Orders)
                .Where(u => u.Id == userId)
                .Select(u => new
                {
                    id = u.Id,
                    fullName = u.FullName,
                    email = u.Email,
                    phoneNumber = u.Phone,
                    avatarUrl = (string?)null,
                    totalSpent = u.Orders.Sum(o => (decimal?)o.TotalAmount) ?? 0,
                    orderCount = u.Orders.Count,
                    defaultAddress = u.UserAddresses
                        .Where(a => a.IsDefault)
                        .Select(a => new
                        {
                            id = a.Id,
                            fullName = a.ContactName,
                            phoneNumber = a.Phone,
                            street = a.DetailAddress,
                            ward = a.WardName ?? "",
                            district = a.DistrictName ?? "",
                            city = a.ProvinceName ?? "",
                            isDefault = a.IsDefault,
                        })
                        .FirstOrDefault(),
                    addresses = u.UserAddresses
                        .OrderByDescending(a => a.IsDefault)
                        .Select(a => new
                        {
                            id = a.Id,
                            fullName = a.ContactName,
                            phoneNumber = a.Phone,
                            street = a.DetailAddress,
                            ward = a.WardName ?? "",
                            district = a.DistrictName ?? "",
                            city = a.ProvinceName ?? "",
                            isDefault = a.IsDefault,
                        })
                        .ToList(),
                })
                .FirstOrDefaultAsync();

            if (user == null)
                return NotFound(new { Error = "Người dùng không tìm thấy." });

            return Ok(user);
        }

        [Authorize]
        [HttpGet("address")]
        public async Task<IActionResult> GetAddresses()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var addresses = await _context.UserAddresses
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.IsDefault)
                .Select(a => new
                {
                    id = a.Id,
                    fullName = a.ContactName,
                    phoneNumber = a.Phone,
                    street = a.DetailAddress,
                    ward = a.WardName ?? "",
                    district = a.DistrictName ?? "",
                    city = a.ProvinceName ?? "",
                    isDefault = a.IsDefault,
                })
                .ToListAsync();

            return Ok(addresses);
        }

        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            if (id != userId)
                return Forbid();

            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { Error = "Người dùng không tìm thấy." });

            if (request.FullName != null)
                user.FullName = request.FullName;
            if (request.Phone != null)
                user.Phone = request.Phone;
            if (request.Email != null)
                user.Email = request.Email;

            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new { message = "Đã cập nhật hồ sơ." });
        }

        [Authorize]
        [HttpPut("address/{id}")]
        public async Task<IActionResult> UpdateAddress(int id, [FromBody] UpdateAddressRequest request)
        {
            var address = await _context.UserAddresses
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (address == null)
                return NotFound(new { Error = "Địa chỉ không tìm thấy." });

            if (request.ContactName != null)
                address.ContactName = request.ContactName;
            if (request.Phone != null)
                address.Phone = request.Phone;
            if (request.ProvinceName != null)
                address.ProvinceName = request.ProvinceName;
            if (request.DistrictName != null)
                address.DistrictName = request.DistrictName;
            if (request.WardName != null)
                address.WardName = request.WardName;
            if (request.DetailAddress != null)
                address.DetailAddress = request.DetailAddress;

            if (request.IsDefault == true)
            {
                var currentDefaults = await _context.UserAddresses
                    .Where(a => a.UserId == address.UserId && a.IsDefault && a.Id != id)
                    .ToListAsync();
                foreach (var addr in currentDefaults)
                    addr.IsDefault = false;

                address.IsDefault = true;
            }

            await _context.SaveChangesAsync(CancellationToken.None);
            return Ok(new { message = "Đã cập nhật địa chỉ." });
        }

        [Authorize]
        [HttpPut("address/{id}/default")]
        public async Task<IActionResult> SetDefaultAddress(int id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var address = await _context.UserAddresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (address == null)
                return NotFound(new { Error = "Địa chỉ không tìm thấy." });

            var currentDefaults = await _context.UserAddresses
                .Where(a => a.UserId == userId && a.IsDefault && a.Id != id)
                .ToListAsync();
            foreach (var addr in currentDefaults)
                addr.IsDefault = false;

            address.IsDefault = true;
            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new { message = "Đã đặt làm mặc định." });
        }

        [Authorize]
        [HttpDelete("address/{id}")]
        public async Task<IActionResult> DeleteAddress(int id)
        {
            var address = await _context.UserAddresses.FindAsync(id);
            if (address == null)
                return NotFound(new { Error = "Địa chỉ không tìm thấy." });

            _context.UserAddresses.Remove(address);
            await _context.SaveChangesAsync(CancellationToken.None);
            return Ok(new { message = "Đã xóa địa chỉ." });
        }

        [Authorize]
        [HttpPost("address")]
        public async Task<IActionResult> AddAddress([FromBody] AddAddressRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new { Error = "Người dùng không tìm thấy." });

            if (request.IsDefault)
            {
                var currentDefaults = await _context.UserAddresses
                    .Where(a => a.UserId == userId && a.IsDefault)
                    .ToListAsync();
                foreach (var addr in currentDefaults)
                    addr.IsDefault = false;
            }

            var address = new UserAddress
            {
                UserId = userId,
                ContactName = request.ContactName ?? "",
                Phone = request.Phone ?? "",
                ProvinceName = request.ProvinceName,
                DistrictName = request.DistrictName,
                WardName = request.WardName,
                DetailAddress = request.DetailAddress ?? "",
                IsDefault = request.IsDefault,
            };

            _context.UserAddresses.Add(address);
            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new { id = address.Id, message = "Đã lưu địa chỉ." });
        }
    }

    public class UpdateUserRequest
    {
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
    }

    public class UpdateAddressRequest
    {
        public string? ContactName { get; set; }
        public string? Phone { get; set; }
        public string? ProvinceName { get; set; }
        public string? DistrictName { get; set; }
        public string? WardName { get; set; }
        public string? DetailAddress { get; set; }
        public bool? IsDefault { get; set; }
    }

    public class AddAddressRequest
    {
        public string? ContactName { get; set; }
        public string? Phone { get; set; }
        public string? ProvinceName { get; set; }
        public string? DistrictName { get; set; }
        public string? WardName { get; set; }
        public string? DetailAddress { get; set; }
        public bool IsDefault { get; set; }
    }
}
